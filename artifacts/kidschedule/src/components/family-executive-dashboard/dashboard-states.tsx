import { Skeleton } from "@/components/ui/skeleton";

export function HubDashboardSkeleton() {
  return (
    <div
      className="rounded-2xl border border-border/60 bg-card/80 p-4 space-y-3"
      aria-busy="true"
      aria-label="Loading family dashboard"
    >
      <div className="flex items-center gap-4">
        <Skeleton className="h-[88px] w-[88px] rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
    </div>
  );
}

export function HubDashboardPanelSkeleton() {
  return (
    <div className="space-y-4 p-1" aria-busy="true" aria-label="Loading dashboard details">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
