import { ShimmerBlock } from "@/components/route-skeletons/shimmer-block";

/**
 * Nutrition living skeleton — Care sanctuary continuity (not marketplace chrome).
 */
export function NutritionHubSkeleton() {
  return (
    <div
      className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-3 p-4"
      role="status"
      aria-label="Preparing calm nutrition care"
      aria-busy="true"
      data-testid="nutrition-hub-skeleton"
    >
      <ShimmerBlock className="h-4 w-16 rounded-lg bg-white/10" />
      <div className="overflow-hidden rounded-[1.25rem] border border-[rgba(232,212,184,0.16)] bg-[rgba(8,6,12,0.55)]">
        <ShimmerBlock className="h-44 w-full rounded-none bg-white/5" />
        <div className="space-y-2 p-4">
          <ShimmerBlock className="mx-auto h-16 w-[92%] rounded-[1.05rem] bg-white/8" />
          <ShimmerBlock className="mt-3 h-3 w-28 rounded bg-white/10" />
          <ShimmerBlock className="h-14 w-full rounded-[1.05rem] bg-white/8" />
          <ShimmerBlock className="h-14 w-full rounded-[1.05rem] bg-white/8" />
          <ShimmerBlock className="h-14 w-full rounded-[1.05rem] bg-white/8" />
        </div>
      </div>
      <ShimmerBlock className="h-10 w-full rounded-full bg-white/8" />
      <ShimmerBlock className="h-28 w-full rounded-[1.05rem] bg-white/8" />
    </div>
  );
}
