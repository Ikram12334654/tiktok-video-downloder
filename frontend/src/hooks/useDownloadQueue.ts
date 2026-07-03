"use client";

import { useCallback, useRef, useState } from "react";

import {
  getBulkProgressUrl,
  getBulkZipUrl,
  getVideoDownloadUrl,
  startBulkDownload,
} from "@/lib/api";
import type {
  BulkJobStatus,
  BulkVideoState,
  BulkVideoStatus,
  VideoDownloadState,
  VideoMeta,
} from "@/types";

export function useDownloadQueue() {
  // ── Single-video card state ──────────────────────────────────────────────
  const [stateMap, setStateMap] = useState<Map<string, VideoDownloadState>>(new Map());

  // ── Bulk job state (shown in modal) ─────────────────────────────────────
  const [bulkJobStatus, setBulkJobStatus] = useState<BulkJobStatus>("idle");
  const [bulkVideoStates, setBulkVideoStates] = useState<Map<string, BulkVideoState>>(new Map());
  const [jobError, setJobError] = useState<string | null>(null);
  const [zipSize, setZipSize] = useState<number | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const evtSourceRef = useRef<EventSource | null>(null);
  // Holds all video metadata so we can build rows lazily as videos start
  const pendingRef = useRef<Map<string, VideoMeta>>(new Map());

  // ── Helpers ──────────────────────────────────────────────────────────────

  function upsertBulkVideo(id: string, patch: Partial<BulkVideoState>) {
    setBulkVideoStates((prev) => {
      const next = new Map(prev);
      const cur = next.get(id);
      if (cur) {
        next.set(id, { ...cur, ...patch });
      } else {
        // First time we see this video — pull title from pendingRef
        const meta = pendingRef.current.get(id);
        next.set(id, {
          video_id: id,
          title: meta?.title ?? id,
          status: "queued",
          downloaded: 0,
          total: meta?.filesize ?? 0,
          speed: 0,
          ...patch,
        });
      }
      return next;
    });
  }

  // ── Single-video download ────────────────────────────────────────────────

  const downloadSingle = useCallback(async (video: VideoMeta) => {
    setStateMap((prev) => new Map(prev).set(video.id, { status: "downloading" }));
    const url = getVideoDownloadUrl(video.webpage_url, video.title);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body?.detail ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${video.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 200)}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5_000);
      setStateMap((prev) => new Map(prev).set(video.id, { status: "done" }));
    } catch (err) {
      setStateMap((prev) =>
        new Map(prev).set(video.id, {
          status: "error",
          error: err instanceof Error ? err.message : "Download failed",
        })
      );
    }
  }, []);

  // ── Bulk ZIP download ────────────────────────────────────────────────────

  const startZipDownload = useCallback(async (account: string, videos: VideoMeta[]) => {
    if (!videos.length) return;

    // Close any existing SSE connection
    evtSourceRef.current?.close();

    // Init state — videos appear in the modal one-by-one as they start
    pendingRef.current = new Map(videos.map((v) => [v.id, v]));
    setBulkJobStatus("running");
    setJobError(null);
    setZipSize(null);
    setBulkVideoStates(new Map());

    let jobId: string;
    try {
      jobId = await startBulkDownload(account, videos);
    } catch (err) {
      setBulkJobStatus("zip_error");
      setJobError(err instanceof Error ? err.message : "Failed to start download");
      return;
    }

    jobIdRef.current = jobId;

    const evtSource = new EventSource(getBulkProgressUrl(jobId));
    evtSourceRef.current = evtSource;

    evtSource.onmessage = (e: MessageEvent) => {
      const event = JSON.parse(e.data as string);
      switch (event.type as string) {
        case "video_status":
          upsertBulkVideo(event.video_id, { status: event.status as BulkVideoStatus });
          break;

        case "video_progress":
          upsertBulkVideo(event.video_id, {
            status: "downloading",
            downloaded: event.downloaded as number,
            total: event.total as number,
            speed: event.speed as number,
          });
          break;

        case "video_done":
          upsertBulkVideo(event.video_id, {
            status: "done",
            downloaded: event.downloaded as number,
          });
          // also mark the video card as done
          setStateMap((prev) => new Map(prev).set(event.video_id, { status: "done" }));
          break;

        case "video_error":
          upsertBulkVideo(event.video_id, {
            status: "error",
            error: event.message as string,
          });
          setStateMap((prev) =>
            new Map(prev).set(event.video_id, {
              status: "error",
              error: event.message as string,
            })
          );
          break;

        case "zipping":
          setBulkJobStatus("zipping");
          break;

        case "zip_ready": {
          setBulkJobStatus("zip_ready");
          setZipSize((event.zip_size as number) ?? null);
          // Trigger browser download
          const a = document.createElement("a");
          a.href = getBulkZipUrl(jobId);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          break;
        }

        case "zip_error":
          setBulkJobStatus("zip_error");
          setJobError(event.message as string);
          break;
      }
    };

    evtSource.addEventListener("complete", () => {
      evtSource.close();
    });

    evtSource.onerror = () => {
      evtSource.close();
    };
  }, []);

  // ── Reset ────────────────────────────────────────────────────────────────

  function reset() {
    evtSourceRef.current?.close();
    evtSourceRef.current = null;
    jobIdRef.current = null;
    pendingRef.current = new Map();
    setStateMap(new Map());
    setBulkJobStatus("idle");
    setBulkVideoStates(new Map());
    setJobError(null);
    setZipSize(null);
  }

  return {
    // Single-video
    downloadSingle,
    stateMap,
    // Bulk
    startZipDownload,
    bulkJobStatus,
    bulkVideoStates,
    jobError,
    zipSize,
    reset,
  };
}
