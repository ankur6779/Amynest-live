import type { Predictions } from "./types";

export function PredictionPanel({ predictions }: { predictions: Predictions }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground italic">{predictions.label}</p>
      <div className="grid sm:grid-cols-3 gap-3">
        {predictions.horizons.map((h) => (
          <div key={h.days} className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Next {h.days} days</p>
            <dl className="mt-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">MRR (est)</dt>
                <dd className="font-semibold">{h.estimatedMrr != null ? `₹${h.estimatedMrr}` : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">ARR (est)</dt>
                <dd className="font-semibold">{h.estimatedArr != null ? `₹${h.estimatedArr}` : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Installs (est)</dt>
                <dd>{h.estimatedInstalls ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subs (est)</dt>
                <dd>{h.estimatedSubscriptions ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Revenue (est)</dt>
                <dd>{h.estimatedRevenue != null ? `₹${h.estimatedRevenue}` : "—"}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
