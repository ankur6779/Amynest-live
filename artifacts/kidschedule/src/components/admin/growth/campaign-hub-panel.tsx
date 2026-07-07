import type { CampaignHubRow } from "./gos-types";

function fmtMoney(v: number | null) {
  if (v == null) return "—";
  return `₹${v.toLocaleString()}`;
}

export function CampaignHubPanel({
  rows,
  awaitingIntegration,
  integrationTargets,
  message,
}: {
  rows: CampaignHubRow[];
  awaitingIntegration: boolean;
  integrationTargets: string[];
  message: string | null;
}) {
  return (
    <div className="space-y-3">
      {awaitingIntegration && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
          <p className="font-semibold text-amber-300">Awaiting Ad Platform Integration</p>
          <p className="text-muted-foreground mt-0.5">
            Spend, CAC, LTV, and ROAS require connected ad accounts. Architecture ready for:{" "}
            {integrationTargets.join(", ")}.
          </p>
        </div>
      )}
      {message && <p className="text-xs text-muted-foreground">{message}</p>}

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No campaign attribution data in this window.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-[10px] min-w-[900px]">
            <thead>
              <tr className="border-b border-white/10 text-muted-foreground text-left">
                <th className="p-2">Campaign</th>
                <th className="p-2">Platform</th>
                <th className="p-2">Status</th>
                <th className="p-2">Installs</th>
                <th className="p-2">Signups</th>
                <th className="p-2">Routine %</th>
                <th className="p-2">Trial %</th>
                <th className="p-2">Paid</th>
                <th className="p-2">Revenue</th>
                <th className="p-2">Spend</th>
                <th className="p-2">CAC</th>
                <th className="p-2">LTV</th>
                <th className="p-2">ROAS</th>
                <th className="p-2">CTR</th>
                <th className="p-2">CPI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.campaign}-${r.platform}`} className="border-b border-white/5">
                  <td className="p-2 font-medium max-w-[120px] truncate">{r.campaign}</td>
                  <td className="p-2">{r.platform ?? "—"}</td>
                  <td className="p-2 capitalize">{r.status}</td>
                  <td className="p-2">{r.installs}</td>
                  <td className="p-2">{r.signups}</td>
                  <td className="p-2">{r.routinePct != null ? `${r.routinePct}%` : "—"}</td>
                  <td className="p-2">{r.trialPct != null ? `${r.trialPct}%` : "—"}</td>
                  <td className="p-2">{r.paidSubscribers}</td>
                  <td className="p-2">{fmtMoney(r.revenue)}</td>
                  <td className="p-2">{r.spend != null ? fmtMoney(r.spend) : "Awaiting Integration"}</td>
                  <td className="p-2">{r.cac != null ? fmtMoney(r.cac) : "—"}</td>
                  <td className="p-2">{r.ltv != null ? fmtMoney(r.ltv) : "—"}</td>
                  <td className="p-2">{r.roas != null ? `${r.roas}x` : "—"}</td>
                  <td className="p-2">{r.ctr != null ? `${r.ctr}%` : "—"}</td>
                  <td className="p-2">{r.cpi != null ? fmtMoney(r.cpi) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
