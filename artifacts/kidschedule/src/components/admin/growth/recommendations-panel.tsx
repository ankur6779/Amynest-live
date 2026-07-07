import type { Recommendation } from "./types";

export function RecommendationsPanel({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) {
    return <p className="text-xs text-muted-foreground">No recommendations for this window.</p>;
  }
  return (
    <ol className="space-y-2">
      {recommendations.map((rec, idx) => (
        <li
          key={rec.id}
          className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 flex gap-3"
        >
          <span className="text-lg font-bold text-primary/60 font-quicksand w-6 shrink-0">{idx + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm font-semibold">{rec.title}</p>
              <span className="text-[10px] font-bold text-emerald-400">Impact {rec.impactScore}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
            <span className="inline-block mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              {rec.category}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
