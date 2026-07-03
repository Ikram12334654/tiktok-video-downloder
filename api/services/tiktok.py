from __future__ import annotations

"""
TikTok service:

  LISTING   → yt-dlp  (extract_flat, no download, no cookies needed)
  DOWNLOAD  → yt-dlp  (pre-merged h264 MP4, fresh signed URLs)
  SLIDESHOW → yt-dlp audio + tikwm images + ffmpeg → MP4 video
               (TikTok photo posts have no video stream; we build one)
"""

import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any, Callable

import httpx
import yt_dlp

from models.schemas import VideoMeta
from utils.helpers import extract_account, format_upload_date

# ─── tikwm (slideshow images only) ───────────────────────────────────────────
_TIKWM_BASE = "https://www.tikwm.com"
_TIKWM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://www.tikwm.com/",
    "Origin": "https://www.tikwm.com",
}

# ─── yt-dlp format selector ──────────────────────────────────────────────────
# Pre-merged h264+aac MP4 — no ffmpeg merge step needed.
_FORMAT_VIDEO = "best[ext=mp4][vcodec*=h264]/best[ext=mp4]/best"

# ─── Size estimation ──────────────────────────────────────────────────────────
_BITRATE_ESTIMATE_BPS = 250_000


def _estimate_size(duration: float | None) -> int | None:
    if duration is None:
        return None
    return int(duration * _BITRATE_ESTIMATE_BPS)


# ─── Helpers kept for router compatibility ────────────────────────────────────

def cookies_configured() -> bool:
    return True


def _best_thumbnail(entry: dict) -> str:
    for t in reversed(entry.get("thumbnails") or []):
        if url := t.get("url"):
            return url
    return entry.get("thumbnail") or ""


# ─── Video listing  (yt-dlp, extract_flat) ───────────────────────────────────


def fetch_video_list(account_url: str) -> tuple[str, list[VideoMeta]]:
    """List all videos for a TikTok account (metadata only, no downloading)."""
    opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
        "skip_download": True,
    }

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(account_url, download=False)
    except yt_dlp.utils.DownloadError as exc:
        raise RuntimeError(str(exc)) from exc

    if not info:
        raise RuntimeError("yt-dlp returned no data")

    entries: list[dict] = info.get("entries") or []
    if not entries:
        raise ValueError("No videos found for this account")

    account: str = (
        info.get("uploader_id")
        or info.get("uploader")
        or info.get("channel")
        or extract_account(account_url)
        or "unknown"
    )
    if not account.startswith("@"):
        account = f"@{account}"

    videos: list[VideoMeta] = []
    for entry in entries:
        vid_id = entry.get("id") or entry.get("display_id")
        if not vid_id:
            continue

        webpage_url = (
            entry.get("webpage_url")
            or entry.get("url")
            or f"https://www.tiktok.com/{account}/video/{vid_id}"
        )
        duration = entry.get("duration")
        filesize = (
            entry.get("filesize")
            or entry.get("filesize_approx")
            or _estimate_size(duration)
        )
        videos.append(
            VideoMeta(
                id=str(vid_id),
                title=entry.get("title") or entry.get("description") or vid_id,
                webpage_url=webpage_url,
                thumbnail_url=_best_thumbnail(entry),
                duration=duration,
                view_count=entry.get("view_count"),
                upload_date=format_upload_date(entry.get("upload_date")),
                filesize=filesize,
                ext="mp4",
            )
        )

    return account, videos


# ─── Slideshow → MP4 (photo posts) ───────────────────────────────────────────


def _audio_duration(audio_path: str) -> float | None:
    """Return audio duration in seconds using ffprobe."""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", audio_path],
            capture_output=True, timeout=15,
        )
        for stream in json.loads(result.stdout).get("streams", []):
            if stream.get("codec_type") == "audio":
                return float(stream["duration"])
    except Exception:
        pass
    return None


def _slideshow_to_mp4(
    webpage_url: str,
    audio_path: str,
    output_dir: str,
    title: str,
) -> tuple[str, str, int, str]:
    """Combine tikwm slideshow images + audio into an MP4 via ffmpeg."""
    # 1. Fetch image URLs from tikwm
    try:
        resp = httpx.get(
            f"{_TIKWM_BASE}/api/",
            params={"url": webpage_url, "hd": "1"},
            headers=_TIKWM_HEADERS,
            follow_redirects=True,
            timeout=15,
        )
        data = resp.json().get("data", {})
        image_urls: list[str] = data.get("images") or []
    except Exception:
        image_urls = []

    if not image_urls:
        raise RuntimeError(
            "This is a TikTok photo post with no video stream. "
            "Image URLs could not be fetched from the API."
        )

    # 2. Download images
    img_paths: list[Path] = []
    for i, img_url in enumerate(image_urls[:20]):
        try:
            r = httpx.get(
                img_url, follow_redirects=True, timeout=30,
                headers={"User-Agent": _TIKWM_HEADERS["User-Agent"],
                         "Referer": "https://www.tiktok.com/"},
            )
            r.raise_for_status()
            p = Path(output_dir) / f"_slide_{i:03d}.jpg"
            p.write_bytes(r.content)
            img_paths.append(p)
        except Exception:
            pass

    if not img_paths:
        raise RuntimeError("Failed to download slideshow images")

    out_stem = Path(audio_path).stem
    output_path = Path(output_dir) / f"{out_stem}.mp4"

    # 3. Build ffmpeg command
    if len(img_paths) == 1:
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1",
            "-i", str(img_paths[0]),
            "-i", audio_path,
            "-c:v", "libx264", "-tune", "stillimage",
            "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-shortest",
            str(output_path),
        ]
    else:
        duration = _audio_duration(audio_path)
        per_img = (duration / len(img_paths)) if duration else 3.0

        concat_path = Path(output_dir) / "_concat.txt"
        with open(concat_path, "w") as f:
            for p in img_paths:
                f.write(f"file '{p.as_posix()}'\n")
                f.write(f"duration {per_img:.3f}\n")
            f.write(f"file '{img_paths[-1].as_posix()}'\n")  # prevent last-frame drop

        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0", "-i", str(concat_path),
            "-i", audio_path,
            "-c:v", "libx264", "-tune", "stillimage",
            "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-shortest",
            str(output_path),
        ]

    # 4. Run ffmpeg
    result = subprocess.run(cmd, capture_output=True, timeout=300)
    if result.returncode != 0:
        raise RuntimeError(
            f"ffmpeg failed building slideshow: {result.stderr.decode(errors='replace')[:400]}"
        )

    # 5. Cleanup temp files
    for p in img_paths:
        p.unlink(missing_ok=True)

    filesize = os.path.getsize(str(output_path))
    return str(output_path), title, filesize, "mp4"


# ─── Single video download (yt-dlp + optional slideshow fallback) ─────────────


def download_video(
    webpage_url: str,
    output_dir: str,
    progress_hook: Callable[[dict], None] | None = None,
) -> tuple[str, str, int, str]:
    """Download a TikTok video to *output_dir*.

    For regular videos: yt-dlp downloads a pre-merged h264+aac MP4.
    For photo slideshow posts: yt-dlp downloads audio, tikwm provides
    the images, and ffmpeg stitches them into an MP4.

    Returns (file_path, title, filesize_bytes, ext).
    """
    opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "outtmpl": str(Path(output_dir) / "%(id)s.%(ext)s"),
        "format": _FORMAT_VIDEO,
    }
    if progress_hook:
        opts["progress_hooks"] = [progress_hook]

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(webpage_url, download=True)
            file_path = ydl.prepare_filename(info)
    except yt_dlp.utils.DownloadError as exc:
        raise RuntimeError(str(exc)) from exc

    ext = info.get("ext", "")
    title = str(info.get("title") or info.get("id") or "video")
    vcodec = info.get("vcodec") or "none"

    # Detect audio-only result (photo slideshow post)
    if ext in ("mp3", "m4a", "aac", "opus") or vcodec == "none":
        return _slideshow_to_mp4(webpage_url, file_path, output_dir, title)

    filesize = os.path.getsize(file_path)
    return file_path, title, filesize, "mp4"
