import type { GrowthDashboardData } from "./types";

export function CountryTable({ geography }: { geography: GrowthDashboardData["geography"] }) {
  if (geography.length === 0) {
    return <p className="text-xs text-muted-foreground">No geography data in window</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.02] text-muted-foreground">
            <th className="text-left px-2 py-2">Country</th>
            <th className="text-left px-2 py-2">State</th>
            <th className="text-left px-2 py-2">City</th>
            <th className="text-right px-2 py-2">Users</th>
            <th className="text-right px-2 py-2">Revenue</th>
            <th className="text-right px-2 py-2">D7 Ret</th>
          </tr>
        </thead>
        <tbody>
          {geography.map((row) => (
            <tr key={`${row.country}-${row.state}-${row.city}`} className="border-b border-white/5">
              <td className="px-2 py-1.5">{row.country}</td>
              <td className="px-2 py-1.5">{row.state ?? "—"}</td>
              <td className="px-2 py-1.5">{row.city ?? "—"}</td>
              <td className="px-2 py-1.5 text-right">{row.users}</td>
              <td className="px-2 py-1.5 text-right">₹{row.revenue}</td>
              <td className="px-2 py-1.5 text-right">
                {row.retentionD7 != null ? `${row.retentionD7}%` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
