import { useEffect, useMemo, useState } from "react";
import { filterHistoryByRange } from "../storage";
import { HEALTH_LAB_THEME, HEALTH_LAB_TOUCH_TARGET } from "../theme";
import { trackHealthLabEvent } from "../health-lab-analytics";
import {
  avgMetric,
  trendMessage,
  previousPeriodHistory,
  sparklineData,
  consistencyCalendar,
  weeklySummary,
  monthlySummary,
  quarterlySummary,
  progressStory,
  achievementTimeline,
  metricExplanation,
  progressMilestones,
} from "../dashboard-utils";
import { useHealthLabI18n } from "../hooks/use-health-lab-i18n";
import type { DashboardRange, HealthLabPersistedState, WellnessMetric } from "../types";
import { cn } from "@/lib/utils";
import { ArrowLeft, TrendingUp, Calendar } from "lucide-react";

const RANGES: { id: DashboardRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
  { id: "lifetime", label: "All" },
];

const METRICS: { id: WellnessMetric; label: string; color: string }[] = [
  { id: "focus", label: "Focus", color: HEALTH_LAB_THEME.metricFocus },
  { id: "balance", label: "Balance", color: HEALTH_LAB_THEME.metricBalance },
  { id: "calmness", label: "Calmness", color: HEALTH_LAB_THEME.metricCalm },
  { id: "coordination", label: "Coordination", color: HEALTH_LAB_THEME.metricCoord },
  { id: "consistency", label: "Consistency", color: HEALTH_LAB_THEME.metricConsistency },
  { id: "overall", label: "Overall Wellness", color: "from-violet-500 to-indigo-600" },
];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length === 0) return <div className="h-8 text-xs text-violet-400/50">No data yet</div>;
  const max = Math.max(...data, 1);
  return (
    <div className="flex h-8 items-end gap-0.5" role="img" aria-label={`Trend: ${data.join(", ")}`}>
      {data.map((v, i) => (
        <div
          key={i}
          className={cn("w-2 rounded-t bg-gradient-to-t", color)}
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function HealthLabDashboard({
  state,
  childName,
  childId,
  onBack,
}: {
  state: HealthLabPersistedState;
  childName: string;
  childId: number;
  onBack: () => void;
}) {
  const [range, setRange] = useState<DashboardRange>("7d");
  const { t } = useHealthLabI18n();
  const milestones = useMemo(() => progressMilestones(state), [state]);

  useEffect(() => {
    trackHealthLabEvent("health_lab_dashboard_view", childId, { range });
  }, [range, childId]);

  const { filtered, insights, calendar, heatMax } = useMemo(() => {
    const filtered = filterHistoryByRange(state.gameHistory, range);
    const prevFiltered = previousPeriodHistory(state.gameHistory, range);

    const insights = METRICS.map((m) => {
      const current = avgMetric(filtered, m.id);
      const previous = avgMetric(prevFiltered, m.id);
      const spark = sparklineData(filterHistoryByRange(state.gameHistory, "30d"), m.id, 7);
      return {
        ...m,
        current,
        spark,
        message: trendMessage(current, previous, m.label),
      };
    });

    const calendar = consistencyCalendar(state.gameHistory, 28);
    const heatMax = Math.max(...calendar.map((c) => c.sessions), 1);

    return { filtered, insights, calendar, heatMax };
  }, [state.gameHistory, range]);

  const totalXp = filtered.reduce((a, s) => a + s.xpEarned, 0);

  return (
    <div className="mx-auto max-w-lg space-y-5 px-4 pb-28 pt-4">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onBack} className={cn(HEALTH_LAB_TOUCH_TARGET, "rounded-full p-2 text-violet-200 hover:bg-white/10")} aria-label="Back to home">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">{t("dashboard")}</h1>
          <p className="text-xs text-violet-200/70">{childName}&apos;s {t("dashboard_trends", "wellness trends")}</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={cn(
              "min-h-[48px] rounded-full px-3 py-1.5 text-xs font-medium",
              range === r.id ? "bg-violet-500 text-white" : "bg-white/10 text-violet-200",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className={cn(HEALTH_LAB_THEME.cardGlass, "p-4")}>
        <p className="text-xs font-semibold uppercase text-violet-300/70">{t("weekly_summary", "Weekly Summary")}</p>
        <p className="mt-1 text-sm text-white/90">{weeklySummary(state)}</p>
      </div>

      <div className={cn(HEALTH_LAB_THEME.cardGlass, "p-4")}>
        <p className="text-xs font-semibold uppercase text-violet-300/70">{t("monthly_summary")}</p>
        <p className="mt-1 text-sm text-white/90">{monthlySummary(state)}</p>
      </div>

      <div className={cn(HEALTH_LAB_THEME.cardGlass, "p-4")}>
        <p className="text-xs font-semibold uppercase text-violet-300/70">{t("quarterly_summary", "Quarterly Growth")}</p>
        <p className="mt-1 text-sm text-white/90">{quarterlySummary(state)}</p>
      </div>

      <div className={cn(HEALTH_LAB_THEME.cardGlass, "p-4")}>
        <p className="text-xs font-semibold uppercase text-violet-300/70">{t("progress_story", "Progress Story")}</p>
        <p className="mt-1 text-sm text-white/90">{progressStory(state)}</p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-white">{t("progress_milestones", "Progress Milestones")}</h2>
        <div className="space-y-2">
          {milestones.map((m) => (
            <div
              key={m.label}
              className={cn(
                HEALTH_LAB_THEME.cardGlass,
                "flex items-center gap-2 p-3 text-sm",
                m.reached ? "text-emerald-300" : "text-violet-300/50",
              )}
            >
              <span aria-hidden>{m.reached ? "✓" : "○"}</span>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Sessions" value={String(filtered.length)} />
        <MiniStat label="XP earned" value={String(totalXp)} />
        <MiniStat label="Streak" value={`${state.streakDays}d`} />
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          {t("wellness_trends", "Wellness Trends")}
        </h2>
        <div className="space-y-3">
          {insights.map((m) => (
            <div key={m.id} className={cn(HEALTH_LAB_THEME.cardGlass, "p-4")}>
              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-white">{m.label}</span>
                <span className="text-lg font-bold text-amber-300">{m.current || "—"}</span>
              </div>
              <Sparkline data={m.spark} color={m.color} />
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r", m.color)}
                  style={{ width: `${Math.min(100, m.current)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-violet-200/70">{m.message}</p>
              <p className="mt-1 text-xs text-violet-300/50">{metricExplanation(m.id)}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
          <Calendar className="h-4 w-4" />
          {t("session_heatmap", "Session Heatmap")}
        </h2>
        <p className="mb-2 text-xs text-violet-300/60">{t("heatmap_hint", "Darker purple = more play sessions that day")}</p>
        <div className="grid grid-cols-7 gap-1">
          {calendar.map((d) => (
            <div
              key={d.date}
              title={`${d.date}: ${d.sessions} sessions`}
              className="aspect-square rounded-md"
              style={{
                backgroundColor: `rgba(139, 92, 246, ${d.sessions > 0 ? 0.2 + (d.sessions / heatMax) * 0.7 : 0.05})`,
              }}
            />
          ))}
        </div>
      </section>

      {achievementTimeline(state).length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-white">Achievement Timeline</h2>
          <div className="space-y-2">
            {achievementTimeline(state).map((a, i) => (
              <div key={i} className={cn(HEALTH_LAB_THEME.cardGlass, "p-3 text-sm text-white")}>
                {a.label} · {a.date}
              </div>
            ))}
          </div>
        </section>
      )}

      {state.avatarEvolutionHistory.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-white">Avatar Evolution</h2>
          <div className="space-y-2">
            {state.avatarEvolutionHistory.slice().reverse().map((e, i) => (
              <div key={i} className={cn(HEALTH_LAB_THEME.cardGlass, "p-3 text-sm text-white")}>
                Level {e.level} · {new Date(e.timestamp).toLocaleDateString()}
              </div>
            ))}
          </div>
        </section>
      )}

      {filtered.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-white">Recent Activity</h2>
          <div className="space-y-2">
            {filtered.slice(-5).reverse().map((s, i) => (
              <div key={`${s.timestamp}-${i}`} className={cn(HEALTH_LAB_THEME.cardGlass, "p-3 text-sm")}>
                <div className="flex justify-between text-white">
                  <span>{s.gameId.replace(/-/g, " ")}</span>
                  <span className="text-amber-300">{s.score} pts</span>
                </div>
                <p className="text-xs text-violet-300/60">
                  +{s.xpEarned} XP · {new Date(s.timestamp).toLocaleDateString()}
                  {s.simulated && " · simulated"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(HEALTH_LAB_THEME.cardGlass, "p-3 text-center")}>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] uppercase text-violet-300/60">{label}</p>
    </div>
  );
}
