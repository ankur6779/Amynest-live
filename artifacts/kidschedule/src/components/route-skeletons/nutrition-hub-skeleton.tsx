import { ShimmerBlock } from "@/components/route-skeletons/shimmer-block";

export function NutritionHubSkeleton() {
  return (
    <div
      className="flex w-full min-w-0 max-w-full flex-col gap-5"
      role="status"
      aria-label="Loading nutrition hub"
      aria-busy="true"
    >
      <div className="space-y-2">
        <ShimmerBlock className="h-8 w-52 rounded-xl" />
        <ShimmerBlock className="h-4 w-full max-w-lg rounded-lg" />
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-9 w-20 shrink-0 rounded-full" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-28 rounded-2xl" />
        ))}
      </div>

      <ShimmerBlock className="h-44 w-full rounded-2xl" />
      <ShimmerBlock className="h-32 w-full rounded-2xl" />
    </div>
  );
}
