import { ShimmerBlock } from "@/components/route-skeletons/shimmer-block";

export function GenericRouteSkeleton() {
  return (
    <div
      className="flex min-h-[40vh] w-full flex-col gap-4 py-4"
      role="status"
      aria-label="Loading page"
      aria-busy="true"
    >
      <ShimmerBlock className="h-8 w-48 rounded-xl" />
      <ShimmerBlock className="h-4 w-full max-w-md rounded-lg" />
      <ShimmerBlock className="h-32 w-full rounded-2xl" />
      <ShimmerBlock className="h-24 w-full rounded-2xl" />
    </div>
  );
}
