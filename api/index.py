from __future__ import annotations

import sys
from pathlib import Path

# Ensure the api/ directory is on the Python path so that
# absolute imports like "from models.schemas import ..." work.
_api_dir = str(Path(__file__).resolve().parent)
if _api_dir not in sys.path:
    sys.path.insert(0, _api_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import bulk_download, download, videos

app = FastAPI(title="TikTok Bulk Downloader API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(videos.router, prefix="/api")
app.include_router(download.router, prefix="/api")
app.include_router(bulk_download.router, prefix="/api")


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "cookies_configured": True, "auth_available": True}
