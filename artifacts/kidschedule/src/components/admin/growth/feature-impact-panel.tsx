import type { FeatureImpact } from "./types";

export function FeatureImpactPanel({ features }: { features: FeatureImpact[] }) {
  if (features.length === 0) {
    return <p className="text-xs text-muted-foreground">No feature impact data.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.02] text-muted-foreground">
            <th className="text-left px-2 py-2">Feature</th>
            <th className="text-right px-2 py-2">Users</th>
            <th className="text-right px-2 py-2">Usage</th>
            <th className="text-right px-2 py-2">Repeat</th>
            <th className="text-right px-2 py-2">Trial %</th>
            <th className="text-right px-2 py-2">Sub %</th>
            <th className="text-right px-2 py-2">Impact</th>
          </tr>
        </thead>
        <tbody>
          {features.map((f) => (
            <tr key={f.key} className="border-b border-white/5">
              <td className="px-2 py-1.5 font-medium">{f.label}</td>
              <td className="px-2 py-1.5 text-right">{f.users}</td>
              <td className="px-2 py-1.5 text-right">{f.usage}</td>
              <td className="px-2 py-1.5 text-right">
                {f.repeatUsagePct != null ? `${f.repeatUsagePct}%` : "—"}
              </td>
              <td className="px-2 py-1.5 text-right">
                {f.trialCorrelationPct != null ? `${f.trialCorrelationPct}%` : "—"}
              </td>
              <td className="px-2 py-1.5 text-right">
                {f.subscriptionCorrelationPct != null ? `${f.subscriptionCorrelationPct}%` : "—"}
              </td>
              <td className="px-2 py-1.5 text-right font-semibold text-primary">{f.businessImpactScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
