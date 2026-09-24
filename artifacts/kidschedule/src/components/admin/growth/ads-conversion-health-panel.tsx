import type { AdsConversionHealthPayload } from "./gos-types";

function statusClass(status: string): string {
  if (status === "LIVE" || status === "PASS" || status === "AUTO") return "text-emerald-300";
  if (status === "READY_FOR_IMPORT" || status === "TRACKING_ADDED") return "text-amber-300";
  if (status === "INSUFFICIENT_DATA" || status === "DATA_NOT_VERIFIED") return "text-muted-foreground";
  if (status === "NOT_SUITABLE" || status === "NOT_IMPORTED" || status === "ZERO" || status === "NOT_EMITTED") {
    return "text-rose-300";
  }
  return "text-foreground";
}

function cell(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  return String(value);
}

export function AdsConversionHealthPanel({ data }: { data: AdsConversionHealthPayload }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-muted-foreground">
        Campaign {data.campaignId} is not mutated from this view.
        {data.campaignUntouched ? " Live bid/budget/geo remain untouched." : ""}{" "}
        Firebase/GA4/Ads volumes: {data.sources.firebase}. Postgres: {data.sources.postgres}.
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <p className="text-xs font-semibold mb-1">Best quality signal</p>
        <p className="text-sm">
          {data.qualitySignal.enoughData
            ? data.qualitySignal.event
            : "Insufficient data — continue install optimization until enough quality-event volume exists."}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">{data.qualitySignal.reason}</p>
      </div>

      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs"
            >
              <p className="font-semibold">
                {alert.category.toUpperCase()} · {alert.title}
              </p>
              <p className="text-muted-foreground mt-0.5">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-[10px] min-w-[1100px]">
          <thead>
            <tr className="border-b border-white/10 text-muted-foreground text-left">
              <th className="p-2">Event</th>
              <th className="p-2">Firebase</th>
              <th className="p-2">GA4</th>
              <th className="p-2">Postgres</th>
              <th className="p-2">Google Ads</th>
              <th className="p-2">Primary/Secondary</th>
              <th className="p-2">7d</th>
              <th className="p-2">30d</th>
              <th className="p-2">Users 30d</th>
              <th className="p-2">Repeat</th>
              <th className="p-2">Last seen</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.event} className="border-b border-white/5">
                <td className="p-2 font-medium">
                  {row.label}
                  {row.firebaseEvent ? (
                    <span className="block text-muted-foreground">{row.firebaseEvent}</span>
                  ) : null}
                </td>
                <td className={`p-2 ${statusClass(row.firebase)}`}>{row.firebase}</td>
                <td className={`p-2 ${statusClass(row.ga4)}`}>{row.ga4}</td>
                <td className={`p-2 ${statusClass(row.postgres)}`}>{row.postgres}</td>
                <td className={`p-2 ${statusClass(row.googleAds)}`}>{row.googleAds}</td>
                <td className="p-2">{row.primarySecondary}</td>
                <td className="p-2">{cell(row.volume7d)}</td>
                <td className="p-2">{cell(row.volume30d)}</td>
                <td className="p-2">{cell(row.uniqueUsers30d)}</td>
                <td className="p-2">{row.repeatRate == null ? "—" : cell(row.repeatRate)}</td>
                <td className="p-2">{row.lastSeen ? row.lastSeen.slice(0, 10) : "—"}</td>
                <td className={`p-2 ${statusClass(row.status)}`}>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-[10px] min-w-[640px]">
          <thead>
            <tr className="border-b border-white/10 text-muted-foreground text-left">
              <th className="p-2">From</th>
              <th className="p-2">To</th>
              <th className="p-2">From users</th>
              <th className="p-2">To users</th>
              <th className="p-2">Rate</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.rates.map((rate) => (
              <tr key={`${rate.from}-${rate.to}`} className="border-b border-white/5">
                <td className="p-2">{rate.from}</td>
                <td className="p-2">{rate.to}</td>
                <td className="p-2">{rate.fromUsers}</td>
                <td className="p-2">{rate.toUsers}</td>
                <td className="p-2">{rate.ratePct == null ? "—" : `${rate.ratePct}%`}</td>
                <td className={`p-2 ${statusClass(rate.status)}`}>{rate.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground">{data.reportingDelay.note}</p>
    </div>
  );
}
