import { useTranslation } from "react-i18next";
import { Brain, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { AGE_GROUPS, type AgeGroupId } from "@/lib/nutrition-data";
import {
  SCORE_CHECKLIST_IDS,
  SCORE_CHECKLIST_LABEL_KEYS,
  type ScoreChecklistId,
} from "@/features/nutrition/lib/nutrition-score";
import { scoreColor } from "@/features/nutrition/lib/score-colors";
import { useNutritionDailyScore } from "@/features/nutrition/hooks/use-nutrition-daily-score";
import { ScoreRing } from "@/features/nutrition/components/track/score-ring";
import { WeekProgressStrip } from "@/features/nutrition/components/track/week-progress-strip";
import { StreakBadge } from "@/features/nutrition/components/track/streak-badge";
import { WeeklyTrendChart } from "@/features/nutrition/components/track/weekly-trend-chart";

export function NutritionScoreSection({ ageGroupId }: { ageGroupId: AgeGroupId }) {
  const { t } = useTranslation();
  const ageGroup = AGE_GROUPS.find((a) => a.id === ageGroupId)!;
  const { checkList, toggle, score, checked, total } = useNutritionDailyScore();

  const scoreLabel =
    score >= 80
      ? t("nutrition_hub.score.excellent")
      : score >= 60
        ? t("nutrition_hub.score.good")
        : score >= 40
          ? t("nutrition_hub.score.needs_attention")
          : t("nutrition_hub.score.critical");

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl bg-muted border border-border p-4">
        <Trophy className="h-5 w-5 text-foreground mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-foreground">
            {t("nutrition_hub.score.checklist_title", { age: ageGroup.label })}
          </p>
          <p className="text-sm text-foreground">{t("nutrition_hub.score.checklist_subtitle")}</p>
        </div>
      </div>

      <WeekProgressStrip />

      <div className="flex flex-wrap items-center gap-2">
        <StreakBadge />
      </div>

      <WeeklyTrendChart />

      <div className="rounded-2xl border bg-card p-5 flex items-center gap-5">
        <ScoreRing score={score} />
        <div className="flex-1 space-y-2 min-w-0">
          <p className={cn("font-semibold text-lg", scoreColor(score))}>{scoreLabel}</p>
          <p className="text-xs text-muted-foreground">
            {t("nutrition_hub.score.goals_met", { checked, total })}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {SCORE_CHECKLIST_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id as ScoreChecklistId)}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl border px-4 py-3 transition-all text-left",
              checkList[id] ? "bg-muted border-border" : "bg-card border-border hover:bg-muted/50",
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                checkList[id] ? "bg-primary border-primary" : "border-muted-foreground/40",
              )}
            >
              {checkList[id] && <span className="text-primary-foreground text-xs">✓</span>}
            </div>
            <p className={cn("text-sm font-medium", checkList[id] && "line-through text-muted-foreground")}>
              {t(SCORE_CHECKLIST_LABEL_KEYS[id])}
            </p>
          </button>
        ))}
      </div>

      {score < 80 && (
        <div className="rounded-xl bg-muted border border-border p-4">
          <p className="flex items-center gap-2 font-semibold text-foreground text-sm mb-1">
            <Brain className="h-4 w-4" /> {t("nutrition_hub.score.ai_tip_title")}
          </p>
          <p className="text-sm text-foreground">
            {score < 40
              ? t("nutrition_hub.score.ai_tip_low")
              : score < 60
                ? t("nutrition_hub.score.ai_tip_mid")
                : t("nutrition_hub.score.ai_tip_high")}
          </p>
        </div>
      )}
      {score >= 80 && (
        <div className="rounded-xl bg-muted border border-border p-4 text-center">
          <p className="text-2xl mb-1">🌟</p>
          <p className="font-bold text-foreground">{t("nutrition_hub.score.outstanding")}</p>
          <p className="text-sm text-foreground">{t("nutrition_hub.score.keep_it_up")}</p>
        </div>
      )}
    </div>
  );
}
