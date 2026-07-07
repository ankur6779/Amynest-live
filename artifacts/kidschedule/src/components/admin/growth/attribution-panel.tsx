import type { AttributionStage } from "./gos-types";

export function AttributionPanel({ stages, note }: { stages: AttributionStage[]; note: string | null }) {
  if (stages.every((s) => s.users === 0)) {
    return <p className="text-xs text-muted-foreground">No attribution funnel data for this period.</p>;
  }

  return (
    <div className="space-y-4">
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      <div className="space-y-2">
        {stages.map((stage, idx) => (
          <div key={stage.key} className="flex items-center gap-3">
            <div className="w-28 shrink-0 text-[11px] font-medium">{stage.label}</div>
            <div className="flex-1 h-8 rounded-lg bg-white/5 relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary/40 rounded-lg"
                style={{
                  width: `${Math.max(4, stages[0]?.users ? (stage.users / stages[0].users) * 100 : 0)}%`,
                }}
              />
              <span className="relative z-10 px-2 text-[11px] leading-8">{stage.users.toLocaleString()} users</span>
            </div>
            <div className="w-20 text-right text-[10px] text-muted-foreground shrink-0">
              {idx > 0 && stage.conversionPct != null ? `${stage.conversionPct}% conv` : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
