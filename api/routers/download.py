from __future__ import annotations

import asyncio
import re
import tempfile
import threading
import urllib.parse
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from stream_zip import ZIP_64, stream_zip

from models.schemas import VideoMeta
from services.tiktok import download_video
from store import zip_sessions
from utils.helpers import sanitize_folder_name

router = APIRouter()

_UNSAFE_RE = re.compile(r'[^\w\s\-.]')


def _safe_filename(title: str, ext: str = "mp4") -> str:
    name = _UNSAFE_RE.sub("", title).strip()
    return (name or "video")[:200] + f".{ext}"


# ─── Single video download ────────────────────────────────────────────────────

@router.get("/download/video")
async def stream_video(
    webpage_url: str = Query(...),
    filename: str = Query(""),
) -> StreamingResponse:
    """Download a single video: yt-dlp saves to a temp file, we stream it."""
    tmp_dir = tempfile.mkdtemp(prefix="tikdl_single_")
    try:
        file_path, title, filesize, ext = await asyncio.to_thread(
            download_video, webpage_url, tmp_dir
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    safe_name = _safe_filename(filename or title, ext)
    encoded_name = urllib.parse.quote(safe_name)

    async def stream_and_cleanup():
        try:
            with open(file_path, "rb") as f:
                while chunk := f.read(65_536):
                    yield chunk
        finally:
            import shutil
            shutil.rmtree(tmp_dir, ignore_errors=True)

    return StreamingResponse(
        stream_and_cleanup(),
        media_type="video/mp4",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_name}",
            "Content-Length": str(filesize),
            "Cache-Control": "no-store",
            "Content-Type": "video/mp4",
        },
    )


# ─── Bulk ZIP download (streaming, no temp storage) ──────────────────────────

class ZipPrepareRequest(BaseModel):
    account: str
    videos: list[VideoMeta]


@router.post("/download/zip/prepare")
async def prepare_zip(body: ZipPrepareRequest) -> dict:
    """Store the video list under a one-time token (valid 10 min)."""
    if not body.videos:
        raise HTTPException(status_code=400, detail="No videos provided")
    token = str(uuid.uuid4())
    zip_sessions.create(token, body.account, body.videos)
    return {"token": token}


@router.get("/download/zip")
async def stream_zip_route(token: str = Query(...)) -> StreamingResponse:
    """Stream a ZIP of all videos.

    Each video is downloaded via yt-dlp to a temp file, then streamed into
    the ZIP. Uses stream-zip (data-descriptor format) — no seeking required.
    """
    session = zip_sessions.pop(token)
    if not session:
        raise HTTPException(status_code=404, detail="Download link expired or not found")

    folder = sanitize_folder_name(session.account)
    encoded_zip = urllib.parse.quote(f"{folder}.zip")

    return StreamingResponse(
        _build_zip_stream(folder, session.videos),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_zip}",
            "Cache-Control": "no-store",
            "X-Accel-Buffering": "no",
        },
    )


# ─── ZIP internals ────────────────────────────────────────────────────────────

def _member_files(folder: str, videos: list[VideoMeta]):
    """Sync generator used by stream_zip.

    Downloads each video via yt-dlp to a temp file, yields its bytes, then
    cleans up. stream_zip handles the ZIP format without backward seeking.
    """
    import shutil
    modified_at = datetime.now(timezone.utc)

    for video in videos:
        tmp_dir = tempfile.mkdtemp(prefix="tikdl_zip_")
        try:
            try:
                file_path, title, filesize, ext = download_video(video.webpage_url, tmp_dir)
            except Exception:
                shutil.rmtree(tmp_dir, ignore_errors=True)
                continue  # skip failures — ZIP continues

            arcname = f"{folder}/{_safe_filename(title, ext)}"

            def video_chunks(path: str = file_path, tmp: str = tmp_dir):
                try:
                    with open(path, "rb") as f:
                        while chunk := f.read(65_536):
                            yield chunk
                finally:
                    shutil.rmtree(tmp, ignore_errors=True)

            yield arcname, modified_at, 0o600, ZIP_64, video_chunks()
        except Exception:
            shutil.rmtree(tmp_dir, ignore_errors=True)


def _zip_worker(
    chunk_queue: asyncio.Queue,
    loop: asyncio.AbstractEventLoop,
    folder: str,
    videos: list[VideoMeta],
) -> None:
    try:
        for chunk in stream_zip(_member_files(folder, videos)):
            future = asyncio.run_coroutine_threadsafe(chunk_queue.put(chunk), loop)
            future.result()
    finally:
        asyncio.run_coroutine_threadsafe(chunk_queue.put(None), loop).result()


async def _build_zip_stream(folder: str, videos: list[VideoMeta]):
    loop = asyncio.get_running_loop()
    chunk_queue: asyncio.Queue[bytes | None] = asyncio.Queue(maxsize=16)

    thread = threading.Thread(
        target=_zip_worker,
        args=(chunk_queue, loop, folder, videos),
        daemon=True,
    )
    thread.start()

    try:
        while True:
            chunk = await chunk_queue.get()
            if chunk is None:
                break
            yield chunk
    finally:
        thread.join(timeout=30)
