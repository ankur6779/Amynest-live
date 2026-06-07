import { ShimmerBlock } from "@/components/route-skeletons/shimmer-block";

/** Speech Coach — intro card, child picker chips, then a stats grid. */
export function SpeechCoachSkeleton() {
  return (
    <div
      className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-4"
      role="status"
      aria-label="Loading speech coach"
      aria-busy="true"
    >
      <div className="flex items-start gap-3 rounded-3xl border border-border bg-card p-5">
        <ShimmerBlock className="h-10 w-10 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <ShimmerBlock className="h-5 w-48 rounded-lg" />
          <ShimmerBlock className="h-3 w-full max-w-md rounded-lg" />
          <ShimmerBlock className="h-3 w-3/4 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-muted/50 px-3 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-20 rounded-2xl" />
        ))}
      </div>

      <ShimmerBlock className="h-28 w-full rounded-2xl" />
    </div>
  );
}
