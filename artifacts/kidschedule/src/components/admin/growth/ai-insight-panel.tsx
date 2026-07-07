import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AmyInsight, GrowthDashboardData, InsightPriority } from "./types";

const PRIORITY_STYLES: Record<InsightPriority, string> = {
  critical: "border-rose-500/40 bg-rose-500/10",
  high: "border-amber-500/40 bg-amber-500/10",
  medium: "border-sky-500/40 bg-sky-500/10",
  low: "border-white/10 bg-white/[0.02]",
};

const PRIORITY_LABEL: Record<InsightPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

type Props = {
  insights?: GrowthDashboardData["insights"];
  amyInsights?: AmyInsight[];
};

export function AIInsightPanel({ insights, amyInsights }: Props) {
  if (amyInsights && amyInsights.length > 0) {
    return (
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-4 w-4 text-violet-400" />
          <h3 className="font-semibold font-quicksand">Amy Growth Intelligence</h3>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground ml-auto">
            Prioritized · Rule-based
          </span>
        </div>
        <ul className="space-y-3">
          {amyInsights.map((insight) => (
            <li
              key={insight.id}
              className={cn("rounded-xl border p-3", PRIORITY_STYLES[insight.priority])}
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300">
                  {PRIORITY_LABEL[insight.priority]}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  Confidence {insight.confidence}%
                </span>
              </div>
              <p className="text-sm font-semibold mt-1">{insight.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-muted-foreground">
                {insight.affectedUsers > 0 && <span>{insight.affectedUsers} users affected</span>}
                {insight.trendPct != null && (
                  <span className={insight.trendPct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {insight.trendPct >= 0 ? "+" : ""}
                    {insight.trendPct}% trend
                  </span>
                )}
              </div>
              <p className="text-xs mt-2 text-foreground/90">
                <span className="font-semibold">Suggested action:</span> {insight.suggestedAction}
              </p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!insights || insights.length === 0) return null;

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-4 w-4 text-violet-400" />
        <h3 className="font-semibold font-quicksand">Amy Growth Intelligence</h3>
      </div>
      <ul className="space-y-2">
        {insights.map((insight) => (
          <li key={insight.id} className="text-sm rounded-lg px-2 py-1.5 bg-white/5">
            {insight.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
