import type { PlatformParentInsights } from "@workspace/world-engine";

type PlatformParentChartsProps = {
  insights: PlatformParentInsights;
};

function BarChart({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 print:break-inside-avoid">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not enough data yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-foreground">{row.label}</span>
                <span className="text-muted-foreground">{row.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.round((row.value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PlatformParentCharts({ insights }: PlatformParentChartsProps) {
  const weeklyRows = insights.weeklyProgress.map((w) => ({
    label: w.weekKey.slice(5),
    value: w.minutes,
  }));
  const monthlyRows = insights.monthlyProgress.map((m) => ({
    label: m.monthKey,
    value: m.itemsOpened,
  }));

  return (
    <div className="space-y-4">
      <BarChart title="Weekly learning time (minutes)" rows={weeklyRows} />
      <BarChart title="Growth over time (items opened)" rows={monthlyRows} />
      <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[rgba(18,28,60,0.72)] px-4 py-3">
          <p className="text-xs uppercase text-muted-foreground">Quiz accuracy</p>
          <p className="mt-1 text-2xl font-bold">{insights.quizAccuracyPct}%</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[rgba(18,28,60,0.72)] px-4 py-3">
          <p className="text-xs uppercase text-muted-foreground">Recognition accuracy</p>
          <p className="mt-1 text-2xl font-bold">{insights.hearFindAccuracyPct}%</p>
        </div>
      </div>
    </div>
  );
}
