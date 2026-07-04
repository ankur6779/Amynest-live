import { CheckCircle2, Circle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DashboardGlassCard } from "@/components/dashboard-glass-card";
import { DASHBOARD_TINTS } from "@/lib/dashboard-premium";
import type { RetentionDailyGoals } from "@/lib/retention/retention-api";

const GOAL_ROWS: { key: keyof RetentionDailyGoals; labelKey: string; fallback: string }[] = [
  { key: "routine", labelKey: "retention.goal_routine", fallback: "Complete routine" },
  { key: "story", labelKey: "retention.goal_story", fallback: "Read one story" },
  { key: "activity", labelKey: "retention.goal_activity", fallback: "Finish one activity" },
  { key: "speech", labelKey: "retention.goal_speech", fallback: "Practice speech" },
];

type Props = {
  goals?: RetentionDailyGoals;
  goalsComplete?: number;
};

export function DailyGoalsCard({ goals, goalsComplete = 0 }: Props) {
  const { t } = useTranslation();
  const allDone = goalsComplete >= 4;

  return (
    <DashboardGlassCard tintRgb={DASHBOARD_TINTS.journey}>
      <div className="p-4 space-y-3" data-testid="daily-goals-card">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-white">{t("retention.todays_goals", "Today's goals")}</p>
          <span className="text-xs text-white/55">{goalsComplete}/4</span>
        </div>
        <ul className="space-y-2" role="list">
          {GOAL_ROWS.map(({ key, labelKey, fallback }) => {
            const done = goals?.[key] ?? false;
            return (
              <li key={key} className="flex items-center gap-2 text-sm text-white/85">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden />
                ) : (
                  <Circle className="h-4 w-4 text-white/35 shrink-0" aria-hidden />
                )}
                <span className={done ? "line-through text-white/45" : undefined}>
                  {t(labelKey, fallback)}
                </span>
              </li>
            );
          })}
        </ul>
        {allDone ? (
          <p className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
            <span aria-hidden>🎉</span>
            {t("retention.all_goals_done", "All goals complete — bonus stars earned!")}
          </p>
        ) : null}
      </div>
    </DashboardGlassCard>
  );
}
