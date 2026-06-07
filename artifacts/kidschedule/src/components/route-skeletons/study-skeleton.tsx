import { ShimmerBlock } from "@/components/route-skeletons/shimmer-block";

/** Study zone — sticky header (back + icon + title), then plan + lesson cards. */
export function StudySkeleton() {
  return (
    <div
      className="w-full min-w-0 max-w-full"
      role="status"
      aria-label="Loading study zone"
      aria-busy="true"
    >
      <div className="mx-auto flex max-w-4xl items-center gap-3 py-3">
        <ShimmerBlock className="h-9 w-9 shrink-0 rounded-full" />
        <ShimmerBlock className="h-10 w-10 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <ShimmerBlock className="h-5 w-40 rounded-lg" />
          <ShimmerBlock className="h-3 w-56 max-w-full rounded-lg" />
        </div>
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        <ShimmerBlock className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <ShimmerBlock key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <ShimmerBlock className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}
