import { cn } from "@/lib/utils";
import type { FeatureMetric } from "./types";

export function FeatureCards({ features }: { features: FeatureMetric[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {features.map((f) => (
        <div key={f.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs font-semibold">{f.label}</p>
          <p className="text-2xl font-bold font-quicksand mt-1">{f.dau}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">DAU</p>
          <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
            <span>Completion: {f.completionPct != null ? `${f.completionPct}%` : "—"}</span>
            <span>Avg time: {f.avgTimeSec != null ? `${f.avgTimeSec}s` : "—"}</span>
            <span>Repeat: {f.repeatUsagePct != null ? `${f.repeatUsagePct}%` : "—"}</span>
            {f.trendPct != null && (
              <span className={cn(f.trendPct >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {f.trendPct >= 0 ? "+" : ""}
                {f.trendPct}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
