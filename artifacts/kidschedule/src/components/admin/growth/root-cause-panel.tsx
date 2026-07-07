import type { RootCause } from "./types";

export function RootCausePanel({ causes }: { causes: RootCause[] }) {
  if (causes.length === 0) {
    return <p className="text-xs text-muted-foreground">No root cause hypotheses for this window.</p>;
  }
  return (
    <div className="space-y-3">
      {causes.map((cause) => (
        <div key={cause.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{cause.title}</p>
            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 shrink-0">
              {cause.confidence}% conf
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{cause.explanation}</p>
          <p className="text-[10px] text-muted-foreground mt-2 font-mono">
            {cause.metrics.join(" · ")}
          </p>
        </div>
      ))}
    </div>
  );
}
