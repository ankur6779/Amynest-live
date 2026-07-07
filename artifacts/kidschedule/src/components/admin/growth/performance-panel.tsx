import type { GrowthDashboardData } from "./types";

export function PerformancePanel({ performance }: { performance: GrowthDashboardData["performance"] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[
        { label: "TTFB (p50)", value: performance.ttfbMs != null ? `${performance.ttfbMs}ms` : "—" },
        { label: "API Latency (p50)", value: performance.apiLatencyMs != null ? `${performance.apiLatencyMs}ms` : "—" },
        { label: "Crashes", value: performance.crashCount },
        { label: "JS Errors", value: performance.jsErrors },
        { label: "Network Errors", value: performance.networkErrors },
        {
          label: "Crash Free %",
          value: performance.crashFreePct != null ? `${performance.crashFreePct}%` : "—",
        },
      ].map((item) => (
        <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{item.label}</p>
          <p className="text-lg font-bold font-quicksand">{item.value}</p>
        </div>
      ))}
      <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-white/10 p-3">
        <p className="text-xs font-semibold mb-2">Slow Screens (&gt;2s render)</p>
        {performance.slowScreens.length === 0 ? (
          <p className="text-xs text-muted-foreground">None detected</p>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-1">Screen</th>
                <th className="text-right py-1">Count</th>
                <th className="text-right py-1">Avg ms</th>
              </tr>
            </thead>
            <tbody>
              {performance.slowScreens.map((s) => (
                <tr key={s.screen} className="border-t border-white/5">
                  <td className="py-1 truncate max-w-[200px]">{s.screen}</td>
                  <td className="text-right py-1">{s.count}</td>
                  <td className="text-right py-1">{s.avgMs ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
