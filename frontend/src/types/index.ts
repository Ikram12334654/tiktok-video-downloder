export interface VideoMeta {
  id: string;
  title: string;
  webpage_url: string;
  thumbnail_url: string;
  duration: number | null;
  view_count: number | null;
  upload_date: string | null;
  filesize: number | null;
  ext: string | null;
}

export interface FetchVideosResponse {
  account: string;
  videos: VideoMeta[];
  total: number;
  total_size: number | null;
}

// ─── Single-video card download state ─────────────────────────────────────────

export type DownloadStatus = "idle" | "pending" | "downloading" | "done" | "error";

export interface VideoDownloadState {
  status: DownloadStatus;
  error?: string;
}

// ─── Bulk download job ─────────────────────────────────────────────────────────

export type BulkVideoStatus = "queued" | "downloading" | "done" | "error";

export interface BulkVideoState {
  video_id: string;
  title: string;
  status: BulkVideoStatus;
  downloaded: number;
  total: number;
  speed: number;
  error?: string;
}

/** Overall state of the bulk download job shown in the modal. */
export type BulkJobStatus =
  | "idle"        // no job running
  | "running"     // videos are being downloaded
  | "zipping"     // all downloaded, creating ZIP
  | "zip_ready"   // ZIP is ready, browser download triggered
  | "zip_error";  // something went wrong

// Legacy — kept for DownloadPanel compatibility (unused for bulk now)
export type ZipStatus = "idle" | "preparing" | "started" | "error";
