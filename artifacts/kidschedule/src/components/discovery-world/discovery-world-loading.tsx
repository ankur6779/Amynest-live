import { SKELETON_BASE } from "@/lib/experience-system";
import { cn } from "@/lib/utils";

export function DiscoveryWorldGridSkeleton({ columns = 2 }: { columns?: number }) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={cn(SKELETON_BASE, "aspect-[4/5] rounded-[24px]")}
        />
      ))}
    </div>
  );
}
