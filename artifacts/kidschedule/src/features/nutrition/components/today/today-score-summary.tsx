import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { scoreColor } from "@/features/nutrition/lib/score-colors";
import { NUTRITION_SCORE_CARD } from "@/features/nutrition/lib/nutrition-ui-tokens";
import { nutritionFadeUp } from "@/features/nutrition/lib/nutrition-motion";
import { useNutritionDailyScore } from "@/features/nutrition/hooks/use-nutrition-daily-score";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { ScoreRing } from "@/features/nutrition/components/track/score-ring";
import { WeekProgressStrip } from "@/features/nutrition/components/track/week-progress-strip";
import { StreakBadge } from "@/features/nutrition/components/track/streak-badge";

export function TodayScoreSummary() {
  const { t } = useTranslation();
  const { setActiveTab } = useNutritionContext();
  const { score, checked, total } = useNutritionDailyScore();
  const isEmpty = score === 0 && checked === 0;

  const scoreLabel = isEmpty
    ? t("nutrition_hub.score.build_invitation")
    : score >= 80
      ? t("nutrition_hub.score.excellent")
      : score >= 60
        ? t("nutrition_hub.score.good")
        : score >= 40
          ? t("nutrition_hub.score.needs_attention")
          : t("nutrition_hub.score.critical");

  return (
    <motion.div
      className="space-y-2"
      variants={nutritionFadeUp}
      initial="initial"
      animate="animate"
    >
      <div className={cn(NUTRITION_SCORE_CARD, "overflow-hidden")}>
        {/* Warm spotlight behind ring */}
        <div
          className="pointer-events-none absolute -left-8 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-amber-400/10 blur-3xl"
          aria-hidden
        />
        <div className="relative p-4 sm:p-5 flex items-center gap-4">
          <ScoreRing score={score} size={96} strokeWidth={8} />
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/70">
              {t("nutrition_hub.today.daily_score")}
            </p>
            <StreakBadge compact />
            <p
              className={cn(
                "font-semibold text-sm sm:text-base",
                isEmpty ? "text-amber-100/90" : scoreColor(score),
              )}
            >
              {scoreLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              {checked === 0
                ? t("nutrition_hub.today.score_empty")
                : t("nutrition_hub.score.goals_met", { checked, total })}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(
                "mt-1 border-amber-400/30 hover:bg-amber-500/10 hover:border-amber-400/45",
                isEmpty && "nutrition-cta-glow",
              )}
              onClick={() => setActiveTab("track")}
            >
              {checked === 0 ? t("nutrition_hub.today.start_checkin") : t("nutrition_hub.today.continue_checkin")}
            </Button>
          </div>
        </div>
      </div>
      <WeekProgressStrip compact />
    </motion.div>
  );
}
