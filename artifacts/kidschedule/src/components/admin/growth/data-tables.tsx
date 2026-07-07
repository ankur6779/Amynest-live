import type { GrowthDashboardData, CampaignRow } from "./types";

type TableSection = {
  title: string;
  headers: string[];
  rows: string[][];
};

function TableBlock({ title, headers, rows }: TableSection) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/10 bg-white/[0.02]">
        <h4 className="text-xs font-semibold">{title}</h4>
      </div>
      <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3">No data</p>
        ) : (
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-background">
              <tr className="text-muted-foreground border-b border-white/10">
                {headers.map((h) => (
                  <th key={h} className="text-left px-2 py-1.5 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-white/5">
                  {row.map((cell, j) => (
                    <td key={j} className="px-2 py-1.5 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function DataTables({
  tables,
  campaigns,
  devices,
}: {
  tables: GrowthDashboardData["tables"];
  campaigns: GrowthDashboardData["campaigns"];
  devices: GrowthDashboardData["devices"];
}) {
  const sections: TableSection[] = [
    {
      title: "Top Countries",
      headers: ["Country", "Users", "Revenue"],
      rows: tables.topCountries.map((r) => [r.country, String(r.users), `₹${r.revenue}`]),
    },
    {
      title: "Top Devices",
      headers: ["Platform", "Users"],
      rows: tables.topDevices.map((r) => [r.device, String(r.users)]),
    },
    {
      title: "Top App Versions",
      headers: ["Version", "Users"],
      rows: tables.topAppVersions.map((r) => [r.version, String(r.users)]),
    },
    {
      title: "Top Screens",
      headers: ["Screen", "Users", "Views"],
      rows: tables.topScreens.map((r) => [r.screen, String(r.users), String(r.views)]),
    },
    {
      title: "Top Events",
      headers: ["Event", "Users", "Count"],
      rows: tables.topEvents.map((r) => [r.event, String(r.users), String(r.count)]),
    },
    {
      title: "Top Referrers",
      headers: ["Referrer", "Users"],
      rows: tables.topReferrers.map((r) => [r.referrer, String(r.users)]),
    },
    {
      title: "Top Campaigns",
      headers: ["Campaign", "Users", "Installs"],
      rows: tables.topCampaigns.map((r) => [r.campaign, String(r.users), String(r.installs)]),
    },
    {
      title: "Browsers",
      headers: ["Browser", "Users"],
      rows: devices.browsers.map((r) => [r.browser, String(r.users)]),
    },
    {
      title: "OS Versions",
      headers: ["OS", "Users"],
      rows: devices.osVersions.map((r) => [r.os, String(r.users)]),
    },
  ];

  return (
    <div className="space-y-4">
      {campaigns.message && (
        <p className="text-xs text-muted-foreground border border-white/10 rounded-lg px-3 py-2">
          {campaigns.message}
        </p>
      )}
      {campaigns.available && campaigns.rows.length > 0 && (
        <CampaignTable rows={campaigns.rows} />
      )}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {sections.map((s) => (
          <TableBlock key={s.title} {...s} />
        ))}
      </div>
    </div>
  );
}

function CampaignTable({ rows }: { rows: CampaignRow[] }) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/10 bg-white/[0.02]">
        <h4 className="text-xs font-semibold">Campaign Performance</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-muted-foreground border-b border-white/10">
              {[
                "Campaign",
                "Platform",
                "Installs",
                "Signups",
                "Routine %",
                "Trial %",
                "Sub %",
              ].map((h) => (
                <th key={h} className="text-left px-2 py-1.5 font-semibold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.campaign}-${r.platform}`} className="border-b border-white/5">
                <td className="px-2 py-1.5">{r.campaign}</td>
                <td className="px-2 py-1.5">{r.platform ?? "—"}</td>
                <td className="px-2 py-1.5">{r.installs}</td>
                <td className="px-2 py-1.5">{r.signups}</td>
                <td className="px-2 py-1.5">{r.routinePct != null ? `${r.routinePct}%` : "—"}</td>
                <td className="px-2 py-1.5">{r.trialPct != null ? `${r.trialPct}%` : "—"}</td>
                <td className="px-2 py-1.5">
                  {r.subscriptionPct != null ? `${r.subscriptionPct}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
