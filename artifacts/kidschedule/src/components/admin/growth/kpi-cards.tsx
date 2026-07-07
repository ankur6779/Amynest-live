import { cn } from "@/lib/utils";
import type { TrendValue } from "./types";
import { KPI_LABELS } from "./types";

function formatValue(key: string, v: TrendValue): string {
  if (v.value == null) return "—";
  if (key === "mrr" || key === "arr" || key === "subscriptionRevenue") {
    return `₹${v.value.toLocaleString()}`;
  }
  if (key === "crashFreePct") return `${v.value}%`;
  return v.value.toLocaleString();
}

export function KPICards({ kpis }: { kpis: Record<string, TrendValue> }) {
  const keys = Object.keys(KPI_LABELS);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
      {keys.map((key) => {
        const kpi = kpis[key] ?? { value: null, previous: null, changePct: null };
        const change = kpi.changePct;
        return (
          <div
            key={key}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 min-w-0"
          >
            <p className="text-[9px] font-bold uppercase tracking-widest text-primary/60 truncate">
              {KPI_LABELS[key]}
            </p>
            <p className="text-lg font-bold font-quicksand mt-0.5 truncate">{formatValue(key, kpi)}</p>
            {change != null && (
              <p
                className={cn(
                  "text-[10px] font-semibold mt-0.5",
                  change > 0 ? "text-emerald-400" : change < 0 ? "text-rose-400" : "text-muted-foreground",
                )}
              >
                {change > 0 ? "+" : ""}
                {change}% vs prior
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
