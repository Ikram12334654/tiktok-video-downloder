from __future__ import annotations

import asyncio
import json
import re
import time
import uuid
import zipfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from models.schemas import VideoMeta
from services.tiktok import download_video
from store import bulk_jobs
from utils.helpers import sanitize_folder_name

router = APIRouter()

_UNSAFE_RE = re.compile(r"[^\w\s\-.]")


def _safe_filename(title: str, ext: str = "mp4") -> str:
    name = _UNSAFE_RE.sub("", title).strip()
    return (name or "video")[:200] + f".{ext}"


# ─── Pydantic request body ────────────────────────────────────────────────────


class BulkStartRequest(BaseModel):
    account: str
    videos: list[VideoMeta]


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/download/bulk/start")
async def start_bulk_download(body: BulkStartRequest) -> dict:
    if not body.videos:
        raise HTTPException(400, "No videos provided")
    job_id = str(uuid.uuid4())
    job = bulk_jobs.create_job(job_id, body.account, body.videos)
    asyncio.create_task(_run_bulk_job(job, body.videos))
    return {"job_id": job_id, "count": len(body.videos)}


@router.get("/download/bulk/progress/{job_id}")
async def bulk_progress_sse(job_id: str) -> StreamingResponse:
    job = bulk_jobs.get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    async def event_gen():
        while True:
            try:
                event = await asyncio.wait_for(job.queue.get(), timeout=90.0)
            except asyncio.TimeoutError:
                yield ": keepalive\n\n"
                continue
            if event is None:
                yield "event: complete\ndata: {}\n\n"
                break
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/download/bulk/zip/{job_id}")
async def download_bulk_zip(job_id: str) -> StreamingResponse:
    job = bulk_jobs.get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found or expired")
    if job.status != "zip_ready" or not job.zip_path:
        raise HTTPException(409, "ZIP not ready yet")

    zip_path = Path(job.zip_path)
    if not zip_path.exists():
        raise HTTPException(404, "ZIP file not found")

    folder = sanitize_folder_name(job.account)
    zip_name = f"{folder}.zip"
    zip_size = zip_path.stat().st_size

    async def stream_and_cleanup():
        try:
            with open(zip_path, "rb") as f:
                while chunk := f.read(65_536):
                    yield chunk
        finally:
            bulk_jobs.remove_job(job_id)

    return StreamingResponse(
        stream_and_cleanup(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{zip_name}"',
            "Content-Length": str(zip_size),
            "Cache-Control": "no-store",
        },
    )


# ─── Job runner ───────────────────────────────────────────────────────────────


async def _run_bulk_job(job: bulk_jobs.BulkJob, videos: list[VideoMeta]) -> None:
    semaphore = asyncio.Semaphore(3)

    async def download_one(video: VideoMeta) -> None:
        async with semaphore:
            await _download_video(video, job)

    await asyncio.gather(*[download_one(v) for v in videos])

    done_count = sum(1 for s in job.videos_state.values() if s.status == "done")
    error_count = sum(1 for s in job.videos_state.values() if s.status == "error")

    if done_count == 0:
        job.status = "zip_error"
        await job.queue.put({"type": "zip_error", "message": "All videos failed to download"})
        await job.queue.put(None)
        return

    await job.queue.put({"type": "all_downloaded", "done": done_count, "errors": error_count})
    job.status = "zipping"
    await job.queue.put({"type": "zipping"})

    try:
        zip_path = await asyncio.to_thread(_create_zip, job)
        job.zip_path = zip_path
        job.status = "zip_ready"
        await job.queue.put({
            "type": "zip_ready",
            "zip_size": Path(zip_path).stat().st_size,
        })
    except Exception as exc:
        job.status = "zip_error"
        await job.queue.put({"type": "zip_error", "message": str(exc)})

    await job.queue.put(None)  # SSE sentinel


async def _download_video(video: VideoMeta, job: bulk_jobs.BulkJob) -> None:
    state = job.videos_state[video.id]
    state.status = "downloading"
    await job.queue.put({"type": "video_status", "video_id": video.id, "status": "downloading"})

    loop = asyncio.get_running_loop()
    last_report: list[float] = [0.0]

    def progress_hook(d: dict) -> None:
        if d["status"] != "downloading":
            return
        downloaded = d.get("downloaded_bytes", 0)
        total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
        speed = int(d.get("speed") or 0)

        state.downloaded = downloaded
        if total:
            state.total = total
        state.speed = speed

        now = time.monotonic()
        if now - last_report[0] >= 0.4:
            last_report[0] = now
            asyncio.run_coroutine_threadsafe(
                job.queue.put({
                    "type": "video_progress",
                    "video_id": video.id,
                    "downloaded": downloaded,
                    "total": total,
                    "speed": speed,
                }),
                loop,
            )

    try:
        file_path, title, filesize, ext = await asyncio.to_thread(
            download_video, video.webpage_url, job.temp_dir, progress_hook
        )
        state.status = "done"
        state.file_path = file_path
        state.downloaded = filesize
        await job.queue.put({"type": "video_done", "video_id": video.id, "downloaded": filesize})

    except Exception as exc:
        state.status = "error"
        state.error = str(exc)
        await job.queue.put({"type": "video_error", "video_id": video.id, "message": str(exc)})


def _create_zip(job: bulk_jobs.BulkJob) -> str:
    folder = sanitize_folder_name(job.account)
    zip_path = str(Path(job.temp_dir) / f"{folder}.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_STORED) as zf:
        for state in job.videos_state.values():
            if state.status == "done" and state.file_path:
                arcname = f"{folder}/{Path(state.file_path).name}"
                zf.write(state.file_path, arcname)
    return zip_path
