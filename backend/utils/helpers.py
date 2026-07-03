from __future__ import annotations

import re


def sanitize_folder_name(account: str) -> str:
    """Strip leading @ and remove characters unsafe for folder names."""
    name = account.lstrip("@")
    # Remove characters that are illegal in Windows/Unix folder names
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "", name)
    name = name.strip(". ")
    return name or "unknown"


def extract_account(url: str) -> str | None:
    """Extract @username from a TikTok profile URL.

    Accepts:
      https://www.tiktok.com/@username
      https://tiktok.com/@username
      @username  (bare handle)
    Returns "@username" or None.
    """
    match = re.search(r"tiktok\.com/@([\w.]+)", url)
    if match:
        return f"@{match.group(1)}"
    # Accept bare @handle too
    bare = re.fullmatch(r"@?([\w.]+)", url.strip())
    if bare:
        return f"@{bare.group(1)}"
    return None


def format_upload_date(raw: str | None) -> str | None:
    """Convert yt-dlp date string "YYYYMMDD" → "YYYY-MM-DD"."""
    if not raw or len(raw) != 8:
        return raw
    return f"{raw[:4]}-{raw[4:6]}-{raw[6:]}"
