"use client";

import Button from "@/components/ui/Button";
import { formatFileSize } from "@/lib/utils";

interface Props {
  account: string;
  total: number;
  totalSize: number | null;
  selectedCount: number;
  isAllSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDownloadSelected: () => void;
  onDownloadAll: () => void;
  isDownloading: boolean;
}

export default function VideoListToolbar({
  account,
  total,
  totalSize,
  selectedCount,
  isAllSelected,
  onSelectAll,
  onDeselectAll,
  onDownloadSelected,
  onDownloadAll,
  isDownloading,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-white/5">
      {/* Account + count + total size */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <span className="text-white font-semibold">{account}</span>
          <span className="text-gray-500 text-sm ml-2">{total} videos</span>
          {totalSize != null && (
            <span className="text-gray-600 text-xs ml-2">
              ~{formatFileSize(totalSize)} total
            </span>
          )}
        </div>
        {selectedCount > 0 && (
          <span className="text-xs bg-accent/15 text-accent px-2 py-0.5 rounded-full font-medium">
            {selectedCount} selected
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={isAllSelected ? onDeselectAll : onSelectAll}
        >
          {isAllSelected ? "Deselect all" : "Select all"}
        </Button>

        {selectedCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onDownloadSelected}
            isLoading={isDownloading}
            leftIcon={<DownloadIcon />}
          >
            Download selected ({selectedCount})
          </Button>
        )}

        <Button
          variant="primary"
          size="sm"
          onClick={onDownloadAll}
          isLoading={isDownloading && selectedCount === 0}
          leftIcon={<DownloadIcon />}
        >
          Download all
        </Button>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10" />
    </svg>
  );
}
