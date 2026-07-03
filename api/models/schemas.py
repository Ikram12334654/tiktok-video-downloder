from __future__ import annotations

from pydantic import BaseModel


class VideoMeta(BaseModel):
    id: str
    title: str
    webpage_url: str
    thumbnail_url: str
    duration: float | None = None
    view_count: int | None = None
    upload_date: str | None = None   # "YYYY-MM-DD"
    filesize: int | None = None      # bytes (exact or estimated from duration)
    ext: str | None = None           # container format e.g. "mp4"


class FetchVideosRequest(BaseModel):
    account_url: str  # https://www.tiktok.com/@username


class FetchVideosResponse(BaseModel):
    account: str           # "@username"
    videos: list[VideoMeta]
    total: int
    total_size: int | None = None    # sum of known/estimated sizes in bytes
