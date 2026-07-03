"use client";

import Image from "next/image";

import ProgressBar from "@/components/ProgressBar";
import Badge from "@/components/ui/Badge";
import { formatDuration, formatFileSize, formatUploadDate, formatViewCount } from "@/lib/utils";
import type { VideoDownloadState, VideoMeta } from "@/types";

interface Props {
  video: VideoMeta;
  isSelected: boolean;
  onToggle: () => void;
  downloadState: VideoDownloadState | null;
}

export default function VideoCard({ video, isSelected, onToggle, downloadState }: Props) {
  const isDone  = downloadState?.status === "done";
  const isError = downloadState?.status === "error";

  return (
    <div
      onClick={onToggle}
      className={`group relative bg-surface-1 rounded-xl overflow-hidden border cursor-pointer transition-all duration-150
        ${isSelected ? "border-accent/60 ring-1 ring-accent/30" : "border-white/5 hover:border-white/15"}
        ${isDone  ? "!border-green-500/30" : ""}
        ${isError ? "!border-red-500/30"   : ""}
      `}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] w-full bg-surface-2 overflow-hidden">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-700">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
        )}

        {/* Bottom-right badges: duration + format type */}
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
          {video.ext && (
            <span className="bg-black/70 text-white/70 text-[9px] px-1 py-0.5 rounded uppercase font-mono tracking-wide">
              {video.ext}
            </span>
          )}
          {video.duration != null && (
            <span className="bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
              {formatDuration(video.duration)}
            </span>
          )}
        </div>

        {/* Checkbox */}
        <div
          className={`absolute top-2 left-2 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150
            ${isSelected
              ? "bg-accent border-accent opacity-100"
              : "bg-black/50 border-white/40 opacity-0 group-hover:opacity-100"
            }`}
        >
          {isSelected && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {/* Done overlay */}
        {isDone && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="text-sm text-white font-medium leading-tight line-clamp-2" title={video.title}>
          {video.title}
        </p>

        {/* Views · date */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          {video.view_count != null && <span>{formatViewCount(video.view_count)} views</span>}
          {video.view_count != null && video.upload_date && <span className="text-gray-700">·</span>}
          {video.upload_date && <span>{formatUploadDate(video.upload_date)}</span>}
        </div>

        {/* File size */}
        {video.filesize != null && (
          <p className="text-[11px] text-gray-600 font-mono">
            ~{formatFileSize(video.filesize)}
          </p>
        )}

        {/* Download state */}
        {downloadState && downloadState.status !== "idle" && (
          <div className="space-y-1.5 pt-0.5">
            <Badge status={downloadState.status} />
            <ProgressBar status={downloadState.status} />
            {isError && downloadState.error && (
              <p className="text-xs text-red-400 truncate" title={downloadState.error}>
                {downloadState.error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
