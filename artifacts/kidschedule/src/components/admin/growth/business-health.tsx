import { cn } from "@/lib/utils";
import type { BusinessHealth, GrowthScore } from "./types";

const HEALTH_STYLES = {
  excellent: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  healthy: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  critical: "border-rose-500/40 bg-rose-500/10 text-rose-300",
} as const;

export function BusinessHealthPanel({ health }: { health: BusinessHealth }) {
  return (
    <div className={cn("rounded-xl border p-4", HEALTH_STYLES[health.status])}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-widest opacity-80">Business Health</p>
          <p className="text-2xl font-bold font-quicksand capitalize">{health.status}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest opacity-80">Score</p>
          <p className="text-2xl font-bold font-quicksand">{health.score}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {health.reasons.map((reason, i) => (
          <li key={i} className="flex gap-2">
            <span className="opacity-60">•</span>
            <span>{reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GrowthScorePanel({ score }: { score: GrowthScore }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Growth Score</p>
          <p className="text-3xl font-bold font-quicksand">{score.overall}</p>
        </div>
        <p className="text-[11px] text-muted-foreground">Weighted 0–100</p>
      </div>
      <div className="space-y-2">
        {score.categories.map((cat) => (
          <div key={cat.key}>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span>{cat.label}</span>
              <span className="font-semibold">{cat.score}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${cat.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
