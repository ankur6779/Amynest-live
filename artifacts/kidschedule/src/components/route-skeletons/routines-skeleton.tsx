import { ShimmerBlock } from "@/components/route-skeletons/shimmer-block";

/** Routines list — title, week-day grid, legend, then schedule cards. */
export function RoutinesSkeleton() {
  return (
    <div
      className="mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-4 pb-28"
      role="status"
      aria-label="Loading routines"
      aria-busy="true"
    >
      <div className="space-y-2">
        <ShimmerBlock className="h-8 w-44 rounded-xl" />
        <ShimmerBlock className="h-4 w-full max-w-sm rounded-lg" />
      </div>

      <div className="flex items-center justify-between">
        <ShimmerBlock className="h-10 w-10 shrink-0 rounded-full" />
        <ShimmerBlock className="h-5 w-40 rounded-lg" />
        <ShimmerBlock className="h-10 w-10 shrink-0 rounded-full" />
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-[76px] rounded-2xl" />
        ))}
      </div>

      <div className="flex flex-wrap gap-3 px-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-4 w-24 rounded-lg" />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
