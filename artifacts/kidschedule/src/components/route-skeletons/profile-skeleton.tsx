import { ShimmerBlock } from "@/components/route-skeletons/shimmer-block";

export function ProfileSkeleton() {
  return (
    <div
      className="flex w-full min-w-0 max-w-2xl flex-col gap-5"
      role="status"
      aria-label="Loading profile"
      aria-busy="true"
    >
      <div className="flex items-center gap-4">
        <ShimmerBlock className="h-20 w-20 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <ShimmerBlock className="h-6 w-40 rounded-lg" />
          <ShimmerBlock className="h-4 w-56 rounded-lg" />
        </div>
      </div>

      {Array.from({ length: 4 }).map((_, i) => (
        <ShimmerBlock key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}
