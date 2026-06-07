import { ShimmerBlock } from "@/components/route-skeletons/shimmer-block";

/** Progress — title, streak banner, then stacked insight cards. */
export function ProgressSkeleton() {
  return (
    <div
      className="mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-6"
      role="status"
      aria-label="Loading progress"
      aria-busy="true"
    >
      <div className="space-y-2">
        <ShimmerBlock className="h-8 w-40 rounded-xl" />
        <ShimmerBlock className="h-4 w-full max-w-md rounded-lg" />
      </div>

      <ShimmerBlock className="h-32 w-full rounded-3xl" />
      <ShimmerBlock className="h-48 w-full rounded-3xl" />
      <ShimmerBlock className="h-32 w-full rounded-3xl" />
    </div>
  );
}
