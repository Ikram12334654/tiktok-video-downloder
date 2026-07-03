from __future__ import annotations

import time
from dataclasses import dataclass

from models.schemas import VideoMeta

_TTL = 600  # 10 minutes


@dataclass
class ZipSession:
    account: str
    videos: list[VideoMeta]
    expires_at: float


_sessions: dict[str, ZipSession] = {}


def create(token: str, account: str, videos: list[VideoMeta]) -> None:
    _sessions[token] = ZipSession(
        account=account,
        videos=videos,
        expires_at=time.monotonic() + _TTL,
    )


def pop(token: str) -> ZipSession | None:
    """Return and remove the session. Returns None if missing or expired."""
    session = _sessions.pop(token, None)
    if session and time.monotonic() > session.expires_at:
        return None
    return session
