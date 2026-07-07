import { cn } from "@/lib/utils";
import type { GrowthDashboardData } from "./types";

function heatColor(rate: number | null): string {
  if (rate == null) return "bg-white/5";
  if (rate >= 20) return "bg-emerald-500/50";
  if (rate >= 10) return "bg-emerald-500/30";
  if (rate >= 5) return "bg-amber-500/30";
  return "bg-rose-500/25";
}

export function RetentionHeatmap({
  retention,
}: {
  retention: GrowthDashboardData["retention"];
}) {
  const days = [1, 3, 7, 14, 30];
  const cohorts = [...new Set(retention.heatmap.map((h) => h.cohort))].slice(-10);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {(["d1", "d3", "d7", "d14", "d30"] as const).map((k, i) => (
          <div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">D{days[i]}</p>
            <p className="text-xl font-bold font-quicksand">
              {retention.summary[k] != null ? `${retention.summary[k]}%` : "—"}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left py-1 pr-2">Cohort</th>
              {days.map((d) => (
                <th key={d} className="px-1 py-1 text-center">
                  D{d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((cohort) => (
              <tr key={cohort}>
                <td className="py-1 pr-2 font-mono text-[10px]">{cohort}</td>
                {days.map((day) => {
                  const cell = retention.heatmap.find((h) => h.cohort === cohort && h.day === day);
                  return (
                    <td key={day} className="p-0.5">
                      <div
                        className={cn(
                          "rounded text-center py-1 px-0.5 font-semibold",
                          heatColor(cell?.rate ?? null),
                        )}
                        title={cell ? `${cell.rate}% (${cell.users} users)` : ""}
                      >
                        {cell?.rate != null ? `${cell.rate}%` : "—"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
