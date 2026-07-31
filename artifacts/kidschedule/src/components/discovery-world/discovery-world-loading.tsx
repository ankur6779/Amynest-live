import { DiscoveryPageLoading } from "./discovery-world-polish";
import { SmoothLoadingGrid, SmoothSkeletonCard } from "./sound-world-motion";

export function DiscoveryWorldGridSkeleton({ columns = 2 }: { columns?: number }) {
  return <SmoothLoadingGrid columns={columns} count={6} />;
}

export function DiscoveryWorldExperienceSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <SmoothSkeletonCard index={0} className="aspect-auto h-10 w-full max-w-md rounded-full" />
      <DiscoveryWorldGridSkeleton columns={2} />
    </div>
  );
}

export { DiscoveryPageLoading };
