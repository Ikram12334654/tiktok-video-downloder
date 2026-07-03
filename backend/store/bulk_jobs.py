from __future__ import annotations

import asyncio
import tempfile
from dataclasses import dataclass
from pathlib import Path


@dataclass
class VideoJobState:
    video_id: str
    title: str
    status: str = "queued"   # queued | downloading | done | error
    downloaded: int = 0
    total: int = 0
    speed: float = 0.0
    error: str | None = None
    file_path: str | None = None


@dataclass
class BulkJob:
    job_id: str
    account: str
    videos_state: dict[str, VideoJobState]
    queue: asyncio.Queue
    temp_dir: str
    status: str = "running"   # running | zipping | zip_ready | zip_error
    zip_path: str | None = None


_jobs: dict[str, BulkJob] = {}


def create_job(job_id: str, account: str, videos) -> BulkJob:
    temp_dir = tempfile.mkdtemp(prefix="tikdl_")
    videos_state = {v.id: VideoJobState(video_id=v.id, title=v.title) for v in videos}
    job = BulkJob(
        job_id=job_id,
        account=account,
        videos_state=videos_state,
        queue=asyncio.Queue(),
        temp_dir=temp_dir,
    )
    _jobs[job_id] = job
    return job


def get_job(job_id: str) -> BulkJob | None:
    return _jobs.get(job_id)


def remove_job(job_id: str) -> None:
    import shutil
    job = _jobs.pop(job_id, None)
    if job:
        shutil.rmtree(job.temp_dir, ignore_errors=True)
