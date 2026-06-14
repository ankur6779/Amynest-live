import { ShimmerBlock } from "@/components/route-skeletons/shimmer-block";

/** Speech Coach — welcome banner, child chips, hero CTA, secondary cards, session types. */
export function SpeechCoachSkeleton() {
  return (
    <div
      className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-4 p-4"
      role="status"
      aria-label="Loading speech coach"
      aria-busy="true"
    >
      <div className="flex items-center gap-2">
        <ShimmerBlock className="h-8 w-28 rounded-lg" />
        <ShimmerBlock className="h-5 w-5 rounded" />
        <ShimmerBlock className="h-6 w-40 rounded-lg" />
      </div>
      <ShimmerBlock className="h-4 w-full max-w-md rounded-lg" />

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 space-y-3">
        <ShimmerBlock className="h-6 w-56 rounded-lg" />
        <ShimmerBlock className="h-3 w-full rounded-lg" />
        <ShimmerBlock className="h-3 w-4/5 rounded-lg" />
        <ShimmerBlock className="h-3 w-48 rounded-lg" />
      </div>

      <ShimmerBlock className="h-28 w-full rounded-3xl" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ShimmerBlock className="h-36 w-full rounded-2xl" />
        <ShimmerBlock className="h-36 w-full rounded-2xl" />
      </div>

      <div className="flex gap-3 overflow-hidden pb-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-32 w-36 shrink-0 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
