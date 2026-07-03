"use client";

import { useState } from "react";

import { fetchVideos } from "@/lib/api";
import type { VideoMeta } from "@/types";

interface State {
  videos: VideoMeta[];
  account: string;
  total: number;
  totalSize: number | null;
  isLoading: boolean;
  error: string | null;
}

const initial: State = {
  videos: [],
  account: "",
  total: 0,
  totalSize: null,
  isLoading: false,
  error: null,
};

export function useVideoFetch() {
  const [state, setState] = useState<State>(initial);

  async function fetch(url: string) {
    setState({ ...initial, isLoading: true });
    try {
      const data = await fetchVideos(url);
      setState({
        videos: data.videos,
        account: data.account,
        total: data.total,
        totalSize: data.total_size ?? null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState({
        ...initial,
        error: err instanceof Error ? err.message : "Failed to fetch videos",
      });
    }
  }

  function reset() {
    setState(initial);
  }

  return { ...state, fetch, reset };
}
