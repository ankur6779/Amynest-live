import type { GrowthDashboardData } from "./types";

export function SubscriptionPanel({ subscriptions }: { subscriptions: GrowthDashboardData["subscriptions"] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Free", value: subscriptions.freeUsers },
          { label: "Trial", value: subscriptions.trialUsers },
          { label: "Paid", value: subscriptions.paidUsers },
          { label: "Expired", value: subscriptions.expiredUsers },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{item.label}</p>
            <p className="text-xl font-bold font-quicksand">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="grid sm:grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl border border-white/10 px-3 py-2">
          MRR: <strong>₹{subscriptions.mrr.toLocaleString()}</strong>
        </div>
        <div className="rounded-xl border border-white/10 px-3 py-2">
          ARR: <strong>₹{subscriptions.arr.toLocaleString()}</strong>
        </div>
        <div className="rounded-xl border border-white/10 px-3 py-2">
          Conversion:{" "}
          <strong>{subscriptions.conversionPct != null ? `${subscriptions.conversionPct}%` : "—"}</strong>
        </div>
        <div className="rounded-xl border border-white/10 px-3 py-2">
          Renewal:{" "}
          <strong>{subscriptions.renewalPct != null ? `${subscriptions.renewalPct}%` : "—"}</strong>
        </div>
        <div className="rounded-xl border border-white/10 px-3 py-2">
          Cancellation:{" "}
          <strong>
            {subscriptions.cancellationPct != null ? `${subscriptions.cancellationPct}%` : "—"}
          </strong>
        </div>
        <div className="rounded-xl border border-white/10 px-3 py-2">
          Active: <strong>{subscriptions.activeUsers}</strong>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold mb-2">Revenue by Country</p>
          <DataMiniTable
            headers={["Country", "Users", "Revenue"]}
            rows={subscriptions.revenueByCountry.map((r) => [
              r.country,
              String(r.users),
              `₹${r.revenue}`,
            ])}
          />
        </div>
        <div>
          <p className="text-xs font-semibold mb-2">Revenue by Platform</p>
          <DataMiniTable
            headers={["Platform", "Users", "Revenue"]}
            rows={subscriptions.revenueByPlatform.map((r) => [
              r.platform,
              String(r.users),
              `₹${r.revenue}`,
            ])}
          />
        </div>
      </div>
    </div>
  );
}

function DataMiniTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">No data</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.02]">
            {headers.map((h) => (
              <th key={h} className="text-left px-2 py-1.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-2 py-1.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
