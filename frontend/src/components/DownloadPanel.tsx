"use client";

import type { ZipStatus } from "@/types";

interface Props {
  zipStatus: ZipStatus;
  zipCount: number;
  zipError: string | null;
  account: string;
  onDismiss: () => void;
}

const messages: Record<ZipStatus, (count: number, account: string) => string> = {
  idle:      ()              => "",
  preparing: (n)             => `Preparing ZIP for ${n} video${n !== 1 ? "s" : ""}…`,
  started:   (n, acc)        => `${acc.replace("@", "")}.zip is downloading — check your browser's download bar`,
  error:     ()              => "Download failed",
};

export default function DownloadPanel({ zipStatus, zipCount, zipError, account, onDismiss }: Props) {
  if (zipStatus === "idle") return null;

  const isError    = zipStatus === "error";
  const isPreparing = zipStatus === "preparing";
  const isStarted  = zipStatus === "started";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface-1/95 backdrop-blur border-t border-white/10 animate-slide-up">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-4">

          {/* Icon */}
          <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
            ${isError ? "bg-red-500/15" : isStarted ? "bg-green-500/15" : "bg-blue-500/15"}`}>
            {isPreparing && (
              <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            )}
            {isStarted && (
              <svg className="w-4 h-4 text-green-400" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10" />
              </svg>
            )}
            {isError && (
              <svg className="w-4 h-4 text-red-400" viewBox="0 0 16 16" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 2l6 12H2L8 2zm0 5v3m0 2v.5" />
              </svg>
            )}
          </div>

          {/* Message */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate
              ${isError ? "text-red-400" : isStarted ? "text-green-400" : "text-white"}`}>
              {messages[zipStatus](zipCount, account)}
            </p>
            {isError && zipError && (
              <p className="text-xs text-red-400/70 mt-0.5 truncate">{zipError}</p>
            )}
            {isStarted && (
              <p className="text-xs text-gray-500 mt-0.5">
                Folder inside ZIP: <code className="text-gray-400">{account.replace("@", "")}/</code>
              </p>
            )}
          </div>

          {/* Dismiss */}
          {(isStarted || isError) && (
            <button
              onClick={onDismiss}
              className="shrink-0 text-gray-500 hover:text-white transition-colors p-1"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
