import { SKELETON_BASE } from "@/lib/experience-system";
import { cn } from "@/lib/utils";
import { DiscoveryPageLoading } from "./discovery-world-polish";

export function DiscoveryWorldGridSkeleton({ columns = 2 }: { columns?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading items"
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={cn(SKELETON_BASE, "aspect-[4/5] rounded-[24px]")}
          aria-hidden
        />
      ))}
      <span className="sr-only">Loading discovery items</span>
    </div>
  );
}

export function DiscoveryWorldExperienceSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className={cn(SKELETON_BASE, "h-10 w-full max-w-md rounded-full")} />
      <DiscoveryWorldGridSkeleton columns={2} />
    </div>
  );
}

export { DiscoveryPageLoading };
