"use client";

import VideoCard from "@/components/VideoCard";
import type { VideoDownloadState, VideoMeta } from "@/types";

interface Props {
  videos: VideoMeta[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  stateMap: Map<string, VideoDownloadState>;
}

export default function VideoGrid({ videos, selectedIds, onToggle, stateMap }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 animate-fade-in">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          isSelected={selectedIds.has(video.id)}
          onToggle={() => onToggle(video.id)}
          downloadState={stateMap.get(video.id) ?? null}
        />
      ))}
    </div>
  );
}
