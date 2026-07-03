import type { FetchVideosResponse, VideoMeta } from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body?.detail ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export function fetchVideos(accountUrl: string): Promise<FetchVideosResponse> {
  return request<FetchVideosResponse>("/api/fetch-videos", {
    method: "POST",
    body: JSON.stringify({ account_url: accountUrl }),
  });
}

/** Returns the stream URL for a single video download. */
export function getVideoDownloadUrl(webpageUrl: string, filename: string): string {
  const params = new URLSearchParams({ webpage_url: webpageUrl, filename });
  return `${BASE}/api/download/video?${params.toString()}`;
}

/** Step 1 of bulk ZIP download — reserve a one-time token. */
export async function prepareZipDownload(
  account: string,
  videos: { id: string; title: string; webpage_url: string; thumbnail_url: string; duration: number | null; view_count: number | null; upload_date: string | null }[]
): Promise<string> {
  const res = await fetch(`${BASE}/api/download/zip/prepare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account, videos }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body?.detail ?? `HTTP ${res.status}`);
  }
  const { token } = await res.json();
  return token as string;
}

/** Step 2 — returns the URL the browser should navigate to for the ZIP stream. */
export function getZipDownloadUrl(token: string): string {
  return `${BASE}/api/download/zip?token=${token}`;
}

export interface HealthResponse {
  status: string;
  cookies_configured: boolean;
  auth_available: boolean;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE}/health`).catch(() => null);
  if (!res || !res.ok) return { status: "error", cookies_configured: false, auth_available: false };
  return res.json();
}

// ─── Bulk download ─────────────────────────────────────────────────────────────

export async function startBulkDownload(
  account: string,
  videos: VideoMeta[]
): Promise<string> {
  const res = await fetch(`${BASE}/api/download/bulk/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account, videos }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body?.detail ?? `HTTP ${res.status}`);
  }
  const { job_id } = await res.json();
  return job_id as string;
}

export function getBulkProgressUrl(jobId: string): string {
  return `${BASE}/api/download/bulk/progress/${jobId}`;
}

export function getBulkZipUrl(jobId: string): string {
  return `${BASE}/api/download/bulk/zip/${jobId}`;
}
