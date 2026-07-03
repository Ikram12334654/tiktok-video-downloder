"use client";

import { useCallback, useMemo, useState } from "react";

import type { VideoMeta } from "@/types";

export function useSelection(videos: VideoMeta[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(videos.map((v) => v.id)));
  }, [videos]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isAllSelected = useMemo(
    () => videos.length > 0 && selectedIds.size === videos.length,
    [videos.length, selectedIds.size]
  );

  return {
    selectedIds,
    toggle,
    selectAll,
    deselectAll,
    isAllSelected,
    selectedCount: selectedIds.size,
  };
}
