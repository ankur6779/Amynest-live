import { ShimmerBlock } from "@/components/route-skeletons/shimmer-block";

export function DashboardSkeleton() {
  return (
    <div
      className="dashboard-page w-full min-w-0 max-w-full bg-[#0a1024]"
      role="status"
      aria-label="Loading dashboard"
      aria-busy="true"
    >
      <div className="flex flex-col gap-5 pb-6 md:pb-8">
        <ShimmerBlock className="h-[168px] w-full rounded-3xl" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[3fr_2fr]">
          <div className="flex flex-col gap-4">
            <ShimmerBlock className="h-28 rounded-2xl" />
            <ShimmerBlock className="h-48 rounded-2xl" />
          </div>
          <div className="flex flex-col gap-3">
            <ShimmerBlock className="h-16 rounded-2xl" />
            <ShimmerBlock className="h-36 rounded-2xl" />
            <ShimmerBlock className="h-24 rounded-2xl" />
            <ShimmerBlock className="h-32 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
