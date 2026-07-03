"use client";

import { useEffect, useState } from "react";

import CookiesBanner from "@/components/CookiesBanner";
import DownloadModal from "@/components/DownloadModal";
import UrlInputForm from "@/components/UrlInputForm";
import VideoGrid from "@/components/VideoGrid";
import VideoGridSkeleton from "@/components/VideoGridSkeleton";
import VideoListToolbar from "@/components/VideoListToolbar";
import { useDownloadQueue } from "@/hooks/useDownloadQueue";
import { useSelection } from "@/hooks/useSelection";
import { useVideoFetch } from "@/hooks/useVideoFetch";
import { fetchHealth } from "@/lib/api";

export default function Home() {
  const { videos, account, total, totalSize, isLoading, error, fetch, reset } = useVideoFetch();
  const { selectedIds, toggle, selectAll, deselectAll, isAllSelected, selectedCount } =
    useSelection(videos);
  const {
    startZipDownload,
    stateMap,
    bulkJobStatus,
    bulkVideoStates,
    jobError,
    zipSize,
    reset: resetDownload,
  } = useDownloadQueue();

  const [showCookiesBanner, setShowCookiesBanner] = useState(false);
  const [downloadTotal, setDownloadTotal] = useState(0);

  useEffect(() => {
    fetchHealth().then((h) => {
      if (!h.auth_available) setShowCookiesBanner(true);
    });
  }, []);

  function handleDownloadSelected() {
    if (!selectedCount) return;
    const selected = videos.filter((v) => selectedIds.has(v.id));
    setDownloadTotal(selected.length);
    startZipDownload(account, selected);
  }

  function handleDownloadAll() {
    if (!videos.length) return;
    setDownloadTotal(videos.length);
    startZipDownload(account, videos);
  }

  function handleReset() {
    reset();
    resetDownload();
  }

  return (
    <div className="min-h-screen bg-surface text-white">
      {/* Header */}
      <header className="border-b border-white/5 bg-surface-1/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.32a8.16 8.16 0 004.77 1.52V7.39a4.85 4.85 0 01-1-.7z" />
              </svg>
            </div>
            <span className="font-semibold text-white text-sm">Bulk Downloader</span>
          </div>

          {videos.length > 0 && (
            <button
              onClick={handleReset}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Start over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-28 space-y-6">
        {/* Cookies warning banner */}
        {showCookiesBanner && (
          <CookiesBanner onDismiss={() => setShowCookiesBanner(false)} />
        )}

        {/* Hero / URL input */}
        {videos.length === 0 && !isLoading && (
          <div className="py-12 text-center space-y-6 animate-fade-in">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Download TikTok videos
              </h1>
              <p className="text-gray-500 text-base">
                Paste a TikTok account URL to fetch and download videos in bulk.
                <br />
                <span className="text-gray-600 text-sm">
                  All videos download as a single ZIP file, saved to your device.
                </span>
              </p>
            </div>
            <div className="max-w-xl mx-auto">
              <UrlInputForm isLoading={isLoading} onFetch={fetch} error={error} />
            </div>
          </div>
        )}

        {/* Compact input (when videos are loaded) */}
        {videos.length > 0 && (
          <div className="max-w-xl animate-fade-in">
            <UrlInputForm isLoading={isLoading} onFetch={fetch} error={error} />
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && <VideoGridSkeleton />}

        {/* Video list */}
        {videos.length > 0 && !isLoading && (
          <div className="space-y-4">
            <VideoListToolbar
              account={account}
              total={total}
              totalSize={totalSize}
              selectedCount={selectedCount}
              isAllSelected={isAllSelected}
              onSelectAll={selectAll}
              onDeselectAll={deselectAll}
              onDownloadSelected={handleDownloadSelected}
              onDownloadAll={handleDownloadAll}
              isDownloading={bulkJobStatus === "running" || bulkJobStatus === "zipping"}
            />
            <VideoGrid
              videos={videos}
              selectedIds={selectedIds}
              onToggle={toggle}
              stateMap={stateMap}
            />
          </div>
        )}
      </main>

      {/* Download modal */}
      <DownloadModal
        jobStatus={bulkJobStatus}
        videoStates={bulkVideoStates}
        totalCount={downloadTotal}
        jobError={jobError}
        zipSize={zipSize}
        account={account}
        onClose={resetDownload}
      />
    </div>
  );
}
