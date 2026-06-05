import { ShimmerBlock } from "@/components/route-skeletons/shimmer-block";

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

      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>

      <ShimmerBlock className="h-36 w-full rounded-2xl" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-28 rounded-2xl" />
        ))}
      </div>

      <div className="space-y-3">
        <ShimmerBlock className="h-5 w-40 rounded-lg" />
        {Array.from({ length: 3 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
