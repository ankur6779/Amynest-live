import { cn } from "@/lib/utils";
import type { FunnelStage } from "./types";

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const maxUsers = Math.max(...stages.map((s) => s.users), 1);

  return (
    <div className="space-y-2">
      {stages.map((stage, idx) => {
        const widthPct = stage.available ? Math.max((stage.users / maxUsers) * 100, 4) : 0;
        return (
          <div key={stage.key} className="relative">
            {idx > 0 && (
              <div className="flex justify-center py-0.5 text-muted-foreground text-[10px]">↓</div>
            )}
            <div
              className={cn(
                "rounded-xl border border-white/10 overflow-hidden",
                !stage.available && "opacity-50",
              )}
            >
              <div className="flex items-stretch">
                <div
                  className="bg-primary/20 border-r border-white/10 px-3 py-2 flex items-center min-w-[140px]"
                  style={{ width: `${Math.max(widthPct, 18)}%` }}
                >
                  <span className="text-xs font-semibold truncate">{stage.label}</span>
                </div>
                <div className="flex-1 px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                  <span>
                    <strong>{stage.available ? stage.users.toLocaleString() : "—"}</strong> users
                  </span>
                  {stage.conversionPct != null && (
                    <span className="text-emerald-400">{stage.conversionPct}% conv</span>
                  )}
                  {stage.dropPct != null && stage.dropPct > 0 && (
                    <span className="text-rose-400">-{stage.dropPct}% drop</span>
                  )}
                  {stage.trendPct != null && (
                    <span className={stage.trendPct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                      {stage.trendPct >= 0 ? "+" : ""}
                      {stage.trendPct}% trend
                    </span>
                  )}
                  {!stage.available && (
                    <span className="text-muted-foreground italic">Requires ad platform data</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
