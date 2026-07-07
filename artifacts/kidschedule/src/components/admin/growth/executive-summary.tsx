import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExecutiveSummary } from "./types";

function TrendIcon({ change }: { change: number | null }) {
  if (change == null || Math.abs(change) < 1) return <Minus className="h-3 w-3 text-muted-foreground" />;
  if (change > 0) return <ArrowUp className="h-3 w-3 text-emerald-400" />;
  return <ArrowDown className="h-3 w-3 text-rose-400" />;
}

function formatMetric(key: string, value: number | null): string {
  if (value == null) return "—";
  if (key.includes("Revenue") || key === "mrr" || key === "arr" || key === "todayRevenue" || key === "yesterdayRevenue") {
    return `₹${value.toLocaleString()}`;
  }
  if (key === "crashFreePct" || key === "growthScore") return `${value}${key === "crashFreePct" ? "%" : ""}`;
  return value.toLocaleString();
}

export function ExecutiveSummaryPanel({ summary }: { summary: ExecutiveSummary }) {
  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-4">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="font-quicksand font-bold text-lg">CEO Executive Summary</h2>
          <p className="text-[11px] text-muted-foreground">
            Revenue trend:{" "}
            <span
              className={cn(
                "font-semibold",
                summary.revenueTrend === "up" && "text-emerald-400",
                summary.revenueTrend === "down" && "text-rose-400",
              )}
            >
              {summary.revenueTrend}
            </span>
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
        {summary.metrics.map((m) => (
          <div key={m.key} className="rounded-xl border border-white/10 bg-background/40 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-primary/60 truncate">{m.label}</p>
            <p className="text-lg font-bold font-quicksand mt-0.5">{formatMetric(m.key, m.value)}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <TrendIcon change={m.changePct} />
              {m.changePct != null && (
                <span
                  className={cn(
                    "text-[10px] font-semibold",
                    m.changePct > 0 ? "text-emerald-400" : m.changePct < 0 ? "text-rose-400" : "text-muted-foreground",
                  )}
                >
                  {m.changePct > 0 ? "+" : ""}
                  {m.changePct}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
