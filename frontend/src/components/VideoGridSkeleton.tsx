const CARD_COUNT = 12;

export default function VideoGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: CARD_COUNT }).map((_, i) => (
        <SkeletonCard key={i} index={i} />
      ))}
    </div>
  );
}

function SkeletonCard({ index }: { index: number }) {
  // Stagger: each card pops in 50 ms after the previous one
  const popDelay = index * 50;
  // Shimmer offset: cards in the same "column wave" are offset by ~120 ms
  const shimmerDelay = (index % 6) * 120;

  return (
    <div
      className="animate-skeleton-pop bg-surface-1 rounded-xl overflow-hidden border border-white/5"
      style={{ animationDelay: `${popDelay}ms` }}
    >
      {/* Thumbnail — 9:16 */}
      <div className="relative aspect-[9/16] overflow-hidden">
        <div
          className="absolute inset-0 skeleton"
          style={{ animationDelay: `${shimmerDelay}ms` }}
        />

        {/* Play icon ghost */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white/10 translate-x-px"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M4 2.5l10 5.5-10 5.5V2.5z" />
            </svg>
          </div>
        </div>

        {/* Duration badge ghost */}
        <div
          className="absolute bottom-2 right-2 h-4 w-9 skeleton rounded"
          style={{ animationDelay: `${shimmerDelay}ms` }}
        />
      </div>

      {/* Info rows */}
      <div className="p-3 space-y-2.5">
        {/* Title lines */}
        <div className="space-y-1.5">
          <div
            className="h-2.5 skeleton rounded-sm w-full"
            style={{ animationDelay: `${shimmerDelay}ms` }}
          />
          <div
            className="h-2.5 skeleton rounded-sm w-3/4"
            style={{ animationDelay: `${shimmerDelay + 60}ms` }}
          />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2">
          <div
            className="h-2 skeleton rounded-sm w-14"
            style={{ animationDelay: `${shimmerDelay + 100}ms` }}
          />
          <div className="w-0.5 h-0.5 rounded-full bg-white/10" />
          <div
            className="h-2 skeleton rounded-sm w-16"
            style={{ animationDelay: `${shimmerDelay + 140}ms` }}
          />
        </div>

        {/* Size badge */}
        <div
          className="h-2 skeleton rounded-sm w-10"
          style={{ animationDelay: `${shimmerDelay + 180}ms` }}
        />
      </div>
    </div>
  );
}
