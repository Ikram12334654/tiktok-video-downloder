"use client";

import { useMemo } from "react";

import { formatFileSize } from "@/lib/utils";
import type { BulkJobStatus, BulkVideoState } from "@/types";

interface Props {
  jobStatus: BulkJobStatus;
  videoStates: Map<string, BulkVideoState>;
  totalCount: number;   // total submitted (may be > visible rows while queued)
  jobError: string | null;
  zipSize: number | null;
  account: string;
  onClose: () => void;
}

export default function DownloadModal({
  jobStatus,
  videoStates,
  totalCount,
  jobError,
  zipSize,
  account,
  onClose,
}: Props) {
  if (jobStatus === "idle") return null;

  const videos = Array.from(videoStates.values());
  const doneCount = videos.filter((v) => v.status === "done").length;
  const errorCount = videos.filter((v) => v.status === "error").length;
  const total = totalCount;

  const totalDownloaded = useMemo(
    () => videos.reduce((sum, v) => sum + v.downloaded, 0),
    [videos]
  );
  const totalBytes = useMemo(
    () => videos.reduce((sum, v) => sum + (v.total || 0), 0),
    [videos]
  );
  const overallPercent = totalBytes > 0 ? Math.min(100, (totalDownloaded / totalBytes) * 100) : 0;
  const totalSpeed = videos
    .filter((v) => v.status === "downloading")
    .reduce((sum, v) => sum + v.speed, 0);

  const isFinished = jobStatus === "zip_ready" || jobStatus === "zip_error";
  const isZipping = jobStatus === "zipping";

  const headerText = (() => {
    if (jobStatus === "zip_ready") return `ZIP ready — downloading to your device`;
    if (jobStatus === "zip_error") return "Download failed";
    if (jobStatus === "zipping") return "Creating ZIP file…";
    return `Downloading ${total} video${total !== 1 ? "s" : ""}`;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={isFinished ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg bg-surface-1 border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 shrink-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
              ${jobStatus === "zip_ready"  ? "bg-green-500/15"  : ""}
              ${jobStatus === "zip_error"  ? "bg-red-500/15"    : ""}
              ${jobStatus === "zipping"    ? "bg-blue-500/15"   : ""}
              ${jobStatus === "running"    ? "bg-accent/15"     : ""}
            `}
          >
            {(jobStatus === "running" || jobStatus === "zipping") && (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin text-blue-400" />
            )}
            {jobStatus === "zip_ready" && (
              <svg className="w-4 h-4 text-green-400" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10" />
              </svg>
            )}
            {jobStatus === "zip_error" && (
              <svg className="w-4 h-4 text-red-400" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 2l6 12H2L8 2zm0 5v3m0 2v.5" />
              </svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold truncate
              ${jobStatus === "zip_ready" ? "text-green-400" : ""}
              ${jobStatus === "zip_error" ? "text-red-400"  : ""}
              ${jobStatus === "running" || jobStatus === "zipping" ? "text-white" : ""}
            `}>
              {headerText}
            </p>
            {jobStatus === "zip_ready" && (
              <p className="text-xs text-gray-500 mt-0.5">
                {zipSize ? formatFileSize(zipSize) : ""} · folder: <code className="text-gray-400">{account.replace("@", "")}/</code>
              </p>
            )}
            {jobStatus === "zip_error" && jobError && (
              <p className="text-xs text-red-400/70 mt-0.5 truncate">{jobError}</p>
            )}
            {jobStatus === "running" && totalSpeed > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {formatFileSize(totalSpeed)}/s · {doneCount}/{total} done
                {errorCount > 0 && <span className="text-red-400 ml-2">{errorCount} failed</span>}
              </p>
            )}
          </div>

          {isFinished && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors p-1 shrink-0"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          )}
        </div>

        {/* Overall progress bar */}
        {(jobStatus === "running" || isZipping) && (
          <div className="px-5 py-3 border-b border-white/5 shrink-0 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {isZipping
                  ? `${doneCount} video${doneCount !== 1 ? "s" : ""} downloaded · creating ZIP…`
                  : `${formatFileSize(totalDownloaded)} / ${totalBytes > 0 ? formatFileSize(totalBytes) : "…"}`}
              </span>
              {!isZipping && <span>{Math.round(overallPercent)}%</span>}
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              {isZipping ? (
                <div className="h-full w-full skeleton rounded-full" />
              ) : (
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${overallPercent}%` }}
                />
              )}
            </div>
          </div>
        )}

        {/* Video list */}
        <div className="overflow-y-auto flex-1 divide-y divide-white/5">
          {videos.map((v) => (
            <VideoRow key={v.video_id} state={v} />
          ))}
        </div>
      </div>
    </div>
  );
}


function VideoRow({ state }: { state: BulkVideoState }) {
  const percent = state.total > 0 ? Math.min(100, (state.downloaded / state.total) * 100) : 0;
  const isDone  = state.status === "done";
  const isError = state.status === "error";
  const isDownloading = state.status === "downloading";
  const isQueued = state.status === "queued";

  return (
    <div className="px-5 py-3 flex items-start gap-3">
      {/* Status icon */}
      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0
        ${isDone     ? "bg-green-500/20" : ""}
        ${isError    ? "bg-red-500/20"   : ""}
        ${isDownloading ? "bg-blue-500/20" : ""}
        ${isQueued   ? "bg-white/5"      : ""}
      `}>
        {isDone && (
          <svg className="w-3 h-3 text-green-400" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isError && (
          <svg className="w-3 h-3 text-red-400" viewBox="0 0 12 12" fill="none">
            <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
          </svg>
        )}
        {isDownloading && (
          <span className="w-2.5 h-2.5 border border-blue-400 border-t-transparent rounded-full animate-spin" />
        )}
        {isQueued && (
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className={`text-xs font-medium truncate leading-tight
          ${isDone ? "text-gray-400" : isError ? "text-red-400" : "text-white"}
        `}>
          {state.title}
        </p>

        {isError && state.error && (
          <p className="text-[11px] text-red-400/70 leading-snug line-clamp-2">{state.error}</p>
        )}

        {isDownloading && (
          <>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-600 font-mono">
              <span>
                {formatFileSize(state.downloaded)}
                {state.total > 0 && ` / ${formatFileSize(state.total)}`}
              </span>
              <span>{state.speed > 0 ? `${formatFileSize(state.speed)}/s` : ""}</span>
            </div>
          </>
        )}

        {isDone && state.downloaded > 0 && (
          <p className="text-[11px] text-gray-600 font-mono">{formatFileSize(state.downloaded)}</p>
        )}
      </div>
    </div>
  );
}
