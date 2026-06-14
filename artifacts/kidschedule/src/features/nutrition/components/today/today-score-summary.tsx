import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { NUTRITION_HUB_ACCENT, hubSectionCardClasses } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import { scoreColor } from "@/features/nutrition/lib/score-colors";
import { useNutritionDailyScore } from "@/features/nutrition/hooks/use-nutrition-daily-score";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { ScoreRing } from "@/features/nutrition/components/track/score-ring";
import { WeekProgressStrip } from "@/features/nutrition/components/track/week-progress-strip";
import { StreakBadge } from "@/features/nutrition/components/track/streak-badge";

export function TodayScoreSummary() {
  const { t } = useTranslation();
  const { setActiveTab } = useNutritionContext();
  const { score, checked, total } = useNutritionDailyScore();

  const scoreLabel =
    score >= 80
      ? t("nutrition_hub.score.excellent")
      : score >= 60
        ? t("nutrition_hub.score.good")
        : score >= 40
          ? t("nutrition_hub.score.needs_attention")
          : t("nutrition_hub.score.critical");

  return (
    <div className="space-y-2">
      <div className={cn(hubSectionCardClasses(NUTRITION_HUB_ACCENT), "overflow-hidden")}>
        <div className="p-4 sm:p-5 flex items-center gap-4">
          <ScoreRing score={score} size={96} strokeWidth={8} />
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("nutrition_hub.today.daily_score")}
            </p>
            <StreakBadge compact />
            <p className={cn("font-semibold text-sm sm:text-base", scoreColor(score))}>{scoreLabel}</p>
            <p className="text-xs text-muted-foreground">
              {checked === 0
                ? t("nutrition_hub.today.score_empty")
                : t("nutrition_hub.score.goals_met", { checked, total })}
            </p>
            <Button type="button" size="sm" variant="outline" className="mt-1" onClick={() => setActiveTab("track")}>
              {checked === 0 ? t("nutrition_hub.today.start_checkin") : t("nutrition_hub.today.continue_checkin")}
            </Button>
          </div>
        </div>
      </div>
      <WeekProgressStrip compact />
    </div>
  );
}
