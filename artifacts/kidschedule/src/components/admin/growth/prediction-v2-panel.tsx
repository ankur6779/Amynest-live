import type { PredictionV2Horizon } from "./gos-types";
import type { Predictions } from "./types";
import { PredictionPanel } from "./prediction-panel";

function HorizonCard({ h }: { h: PredictionV2Horizon }) {
  return (
    <div className="rounded-xl border border-white/10 p-3 space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-semibold text-sm">{h.days} Day</span>
        <span className="text-[10px] text-muted-foreground">Confidence {h.confidencePct}%</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <div><dt className="text-muted-foreground">Revenue (est)</dt><dd>{h.revenue != null ? `₹${h.revenue}` : "—"}</dd></div>
        <div><dt className="text-muted-foreground">MRR (est)</dt><dd>{h.mrr != null ? `₹${h.mrr}` : "—"}</dd></div>
        <div><dt className="text-muted-foreground">ARR (est)</dt><dd>{h.arr != null ? `₹${h.arr}` : "—"}</dd></div>
        <div><dt className="text-muted-foreground">Trials (est)</dt><dd>{h.trials ?? "—"}</dd></div>
        <div><dt className="text-muted-foreground">Subscriptions (est)</dt><dd>{h.subscriptions ?? "—"}</dd></div>
        <div><dt className="text-muted-foreground">Retention D7</dt><dd>{h.retentionD7 != null ? `${h.retentionD7}%` : "—"}</dd></div>
        <div><dt className="text-muted-foreground">Installs (est)</dt><dd>{h.installs ?? "—"}</dd></div>
      </dl>
    </div>
  );
}

export function PredictionV2Panel({
  v1,
  v2,
}: {
  v1: Predictions;
  v2: { label: string; horizons: PredictionV2Horizon[] };
}) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Prediction Engine V2</h4>
        <p className="text-[11px] text-muted-foreground mb-3">{v2.label}</p>
        <div className="grid md:grid-cols-3 gap-3">
          {v2.horizons.map((h) => (
            <HorizonCard key={h.days} h={h} />
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Executive Predictions</h4>
        <PredictionPanel predictions={v1} />
      </div>
    </div>
  );
}
