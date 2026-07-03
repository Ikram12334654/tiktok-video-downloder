"use client";

import { type FormEvent, useState } from "react";

import Button from "@/components/ui/Button";
interface Props {
  isLoading: boolean;
  onFetch: (url: string) => void;
  error: string | null;
}

export default function UrlInputForm({ isLoading, onFetch, error }: Props) {
  const [url, setUrl] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    onFetch(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 1C4.134 1 1 4.134 1 8s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7zM5 8l2 2 4-4" />
            </svg>
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.tiktok.com/@username"
            required
            className="w-full bg-surface-2 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-accent/40 transition-colors"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="sm:w-auto w-full"
          leftIcon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          }
        >
          Fetch videos
        </Button>
      </div>

      {error && (
        <p className="mt-2.5 text-sm text-red-400 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 14 14" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M7 1L1 13h12L7 1zm0 5v3m0 2v.5" />
          </svg>
          {error}
        </p>
      )}
    </form>
  );
}
