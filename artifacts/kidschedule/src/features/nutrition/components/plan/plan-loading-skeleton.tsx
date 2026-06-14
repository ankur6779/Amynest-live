export function PlanLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-2">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-7 w-10 rounded-full bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-muted/30 p-3 h-28" />
        ))}
      </div>
    </div>
  );
}
