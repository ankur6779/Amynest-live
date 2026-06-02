import type { ParentInsightsSnapshot } from "@workspace/animal-world";

type ParentInsightsChartsProps = {
  insights: ParentInsightsSnapshot;
};

function BarChart({
  title,
  rows,
  valueKey,
  labelKey,
}: {
  title: string;
  rows: Array<Record<string, string | number>>;
  valueKey: string;
  labelKey: string;
}) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0));
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not enough data yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, i) => {
            const value = Number(row[valueKey]) || 0;
            const label = String(row[labelKey]);
            return (
              <li key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground">{label}</span>
                  <span className="text-muted-foreground">{value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.round((value / max) * 100)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function ParentInsightsCharts({ insights }: ParentInsightsChartsProps) {
  const weeklyRows = insights.weeklyProgress.map((w) => ({
    label: w.weekKey.slice(5),
    value: w.minutes,
  }));
  const monthlyRows = insights.monthlyProgress.map((m) => ({
    label: m.monthKey,
    value: m.animalsOpened,
  }));

  return (
    <div className="space-y-4">
      <BarChart
        title="Weekly progress (minutes)"
        rows={weeklyRows.map((r) => ({ label: r.label, value: r.value }))}
        valueKey="value"
        labelKey="label"
      />
      <BarChart
        title="Monthly progress (animals opened)"
        rows={monthlyRows.map((r) => ({ label: r.label, value: r.value }))}
        valueKey="value"
        labelKey="label"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[rgba(18,28,60,0.72)] px-4 py-3">
          <p className="text-xs uppercase text-muted-foreground">Quiz accuracy</p>
          <p className="mt-1 text-2xl font-bold">{insights.quizAccuracyPct}%</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[rgba(18,28,60,0.72)] px-4 py-3">
          <p className="text-xs uppercase text-muted-foreground">Hear & Find accuracy</p>
          <p className="mt-1 text-2xl font-bold">{insights.hearFindAccuracyPct}%</p>
        </div>
      </div>
    </div>
  );
}
