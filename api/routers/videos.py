from __future__ import annotations

import asyncio
import re

from fastapi import APIRouter, HTTPException

from models.schemas import FetchVideosRequest, FetchVideosResponse
from services.tiktok import fetch_video_list

router = APIRouter()

_TIKTOK_URL_RE = re.compile(r"https?://(www\.)?tiktok\.com/@[\w.]+", re.IGNORECASE)


@router.post("/fetch-videos", response_model=FetchVideosResponse)
async def fetch_videos(body: FetchVideosRequest) -> FetchVideosResponse:
    url = body.account_url.strip()

    if not _TIKTOK_URL_RE.match(url):
        raise HTTPException(
            status_code=400,
            detail="Invalid TikTok account URL. Expected format: https://www.tiktok.com/@username",
        )

    try:
        account, videos = await asyncio.to_thread(fetch_video_list, url)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    known_sizes = [v.filesize for v in videos if v.filesize is not None]
    total_size = sum(known_sizes) if known_sizes else None

    return FetchVideosResponse(
        account=account,
        videos=videos,
        total=len(videos),
        total_size=total_size,
    )
