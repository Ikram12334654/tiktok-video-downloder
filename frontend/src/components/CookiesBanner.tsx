"use client";

interface Props {
  onDismiss: () => void;
}

export default function CookiesBanner({ onDismiss }: Props) {
  return (
    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-4 flex items-start gap-3">
      <svg className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>

      <div className="flex-1 min-w-0 space-y-3">
        <div>
          <p className="text-sm text-yellow-200 font-semibold">TikTok login required</p>
          <p className="text-xs text-yellow-300/60 mt-0.5">
            A TikTok session is needed to list and download videos.
          </p>
        </div>

        {/* Quick setup */}
        <div className="bg-black/20 rounded-lg px-3 py-2.5 space-y-2">
          <p className="text-xs font-semibold text-yellow-200/80">Quick setup (30 seconds):</p>
          <ol className="space-y-1.5 text-xs text-yellow-300/70 leading-relaxed list-none">
            <li className="flex gap-2">
              <span className="text-yellow-500 font-mono shrink-0">1.</span>
              <span>
                In Chrome, install{" "}
                <span className="text-yellow-200 font-medium">
                  &ldquo;Get cookies.txt LOCALLY&rdquo;
                </span>{" "}
                from the Chrome Web Store
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-500 font-mono shrink-0">2.</span>
              <span>
                Go to{" "}
                <span className="font-mono text-yellow-200">tiktok.com</span>{" "}
                while logged in, click the extension icon
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-500 font-mono shrink-0">3.</span>
              <span>
                Export cookies → save as{" "}
                <span className="font-mono text-yellow-200">backend/cookies.txt</span>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-500 font-mono shrink-0">4.</span>
              <span>Restart the backend — this warning will disappear</span>
            </li>
          </ol>
        </div>

        <p className="text-[11px] text-yellow-300/35 leading-relaxed">
          See <span className="font-mono">backend/cookies.txt.example</span> for alternative methods.
          Cookies expire after a few weeks — re-export if downloads stop working.
        </p>
      </div>

      <button
        onClick={onDismiss}
        className="text-yellow-400/40 hover:text-yellow-200 transition-colors shrink-0 mt-0.5"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.47 4.47a.75.75 0 011.06 0L8 6.94l2.47-2.47a.75.75 0 111.06 1.06L9.06 8l2.47 2.47a.75.75 0 11-1.06 1.06L8 9.06l-2.47 2.47a.75.75 0 01-1.06-1.06L6.94 8 4.47 5.53a.75.75 0 010-1.06z" />
        </svg>
      </button>
    </div>
  );
}
