from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import bulk_download, download, videos

app = FastAPI(title="TikTok Bulk Downloader API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(videos.router, prefix="/api")
app.include_router(download.router, prefix="/api")
app.include_router(bulk_download.router, prefix="/api")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "cookies_configured": True, "auth_available": True}
