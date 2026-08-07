import { ShimmerBlock } from "@/components/route-skeletons/shimmer-block";

/** Pack 1 — skeleton mirrors four room doors (not the legacy chip mall). */
export function ParentingHubSkeleton() {
  return (
    <div
      className="flex w-full min-w-0 max-w-full flex-col gap-5"
      role="status"
      aria-label="Loading parenting hub"
      aria-busy="true"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-2">
          <ShimmerBlock className="h-8 w-56 rounded-xl" />
          <ShimmerBlock className="h-4 w-full max-w-md rounded-lg" />
        </div>
        <ShimmerBlock className="h-12 w-28 shrink-0 rounded-2xl" />
      </div>

      <ShimmerBlock className="h-24 w-full rounded-2xl" />

      <div className="space-y-2">
        <ShimmerBlock className="h-6 w-64 rounded-lg" />
        <ShimmerBlock className="h-4 w-48 rounded-lg" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
