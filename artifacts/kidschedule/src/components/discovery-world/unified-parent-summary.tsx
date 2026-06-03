import { PremiumCard } from "@/components/learning-progress/premium-polish";
import { Progress } from "@/components/ui/progress";
import type { UnifiedParentInsights } from "@/lib/discovery-worlds-unified-insights";
import { Clock, Ear, TrendingDown, TrendingUp, Minus } from "lucide-react";

type UnifiedParentSummaryProps = {
  insights: UnifiedParentInsights;
};

function TrendBadge({ trend }: { trend: UnifiedParentInsights["learningTrend"] }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-300">
        <TrendingUp className="h-3 w-3" aria-hidden />
        Trending up
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-200">
        <TrendingDown className="h-3 w-3" aria-hidden />
        Needs a nudge
      </span>
    );
  }
  if (trend === "steady") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
        <Minus className="h-3 w-3" aria-hidden />
        Steady
      </span>
    );
  }
  return (
    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
      Just getting started
    </span>
  );
}

export function UnifiedParentSummary({ insights }: UnifiedParentSummaryProps) {
  return (
    <PremiumCard tier="glow" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            At a glance
          </p>
          <h2 className="mt-1 text-xl font-bold text-foreground">Learning snapshot</h2>
        </div>
        <TrendBadge trend={insights.learningTrend} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
          <Clock className="h-4 w-4 text-primary" aria-hidden />
          <p className="mt-2 text-xs text-muted-foreground">Total learning time</p>
          <p className="text-lg font-bold tabular-nums">{insights.totalLearningMinutes} min</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
          <Ear className="h-4 w-4 text-violet-300" aria-hidden />
          <p className="mt-2 text-xs text-muted-foreground">Sounds recognized</p>
          <p className="text-lg font-bold tabular-nums">{insights.totalSoundsRecognized}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="text-xs text-muted-foreground">Strongest world</p>
          <p className="mt-1 text-sm font-bold">
            {insights.strongestWorld
              ? `${insights.strongestWorld.emoji} ${insights.strongestWorld.title}`
              : "—"}
          </p>
          {insights.strongestWorld && (
            <p className="text-xs text-muted-foreground">{insights.strongestWorld.masteryPct}% explored</p>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
          <p className="text-xs text-muted-foreground">Needs practice</p>
          <p className="mt-1 text-sm font-bold">
            {insights.weakestWorld
              ? `${insights.weakestWorld.emoji} ${insights.weakestWorld.title}`
              : "—"}
          </p>
          {insights.weakestWorld && (
            <p className="text-xs text-muted-foreground">{insights.weakestWorld.masteryPct}% explored</p>
          )}
        </div>
      </div>

      {insights.mostImprovedWorld && insights.mostImprovedWorld.deltaMinutes > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Most improved this week:{" "}
          <span className="font-semibold text-foreground">
            {insights.mostImprovedWorld.emoji} {insights.mostImprovedWorld.title}
          </span>{" "}
          (+{insights.mostImprovedWorld.deltaMinutes} min)
        </p>
      )}

      <div className="mt-4">
        <div className="flex justify-between text-xs font-semibold text-muted-foreground">
          <span>Overall progress</span>
          <span className="tabular-nums text-foreground">{insights.overallProgressPct}%</span>
        </div>
        <Progress value={insights.overallProgressPct} className="mt-2 h-2" />
      </div>
    </PremiumCard>
  );
}
