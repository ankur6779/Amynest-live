import { ShimmerBlock } from "@/components/route-skeletons/shimmer-block";

/** Games / Creativity & Activities destination skeleton. */
export function CreativityHubSkeleton() {
  return (
    <div
      className="mx-auto flex w-full min-w-0 max-w-[720px] flex-col gap-4"
      role="status"
      aria-label="Loading creativity and activities"
      aria-busy="true"
    >
      <ShimmerBlock className="h-14 w-full rounded-none sm:rounded-2xl" />
      <ShimmerBlock className="h-24 w-full rounded-2xl" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ShimmerBlock key={i} className="aspect-[4/5] rounded-2xl" />
        ))}
      </div>

      <ShimmerBlock className="h-20 w-full rounded-2xl" />
    </div>
  );
}
