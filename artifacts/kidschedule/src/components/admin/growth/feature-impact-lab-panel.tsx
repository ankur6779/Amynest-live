import type { FeatureImpactLabRow } from "./gos-types";

export function FeatureImpactLabPanel({ features }: { features: FeatureImpactLabRow[] }) {
  if (features.length === 0) {
    return <p className="text-xs text-muted-foreground">No feature impact data for this period.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-[10px] min-w-[800px]">
        <thead>
          <tr className="border-b border-white/10 text-muted-foreground text-left">
            <th className="p-2">Rank</th>
            <th className="p-2">Feature</th>
            <th className="p-2">DAU</th>
            <th className="p-2">WAU</th>
            <th className="p-2">MAU</th>
            <th className="p-2">Avg Session</th>
            <th className="p-2">Repeat %</th>
            <th className="p-2">Trial Corr</th>
            <th className="p-2">Sub Corr</th>
            <th className="p-2">Ret Corr</th>
            <th className="p-2">Revenue</th>
            <th className="p-2">Impact</th>
          </tr>
        </thead>
        <tbody>
          {features.map((f) => (
            <tr key={f.key} className="border-b border-white/5">
              <td className="p-2 font-bold text-primary">#{f.rank}</td>
              <td className="p-2 font-medium">{f.label}</td>
              <td className="p-2">{f.dau}</td>
              <td className="p-2">{f.wau}</td>
              <td className="p-2">{f.mau}</td>
              <td className="p-2">{f.avgSessionSec != null ? `${f.avgSessionSec}s` : "—"}</td>
              <td className="p-2">{f.repeatUsagePct != null ? `${f.repeatUsagePct}%` : "—"}</td>
              <td className="p-2">{f.trialCorrelationPct != null ? `${f.trialCorrelationPct}%` : "—"}</td>
              <td className="p-2">{f.subscriptionCorrelationPct != null ? `${f.subscriptionCorrelationPct}%` : "—"}</td>
              <td className="p-2">{f.retentionCorrelationPct != null ? `${f.retentionCorrelationPct}%` : "—"}</td>
              <td className="p-2">₹{f.revenueContribution}</td>
              <td className="p-2 text-emerald-400 font-semibold">{f.businessImpactScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
