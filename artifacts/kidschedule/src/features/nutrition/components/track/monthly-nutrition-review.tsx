import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { useMealMemory } from "@/features/nutrition/hooks/use-meal-memory";
import { useNutritionTrackMeta } from "@/features/nutrition/hooks/use-nutrition-track-meta";
import { buildMonthlyNutritionReview } from "@/features/nutrition/lib/monthly-nutrition-review";
import { getStoreHistory } from "@/features/nutrition/lib/nutrition-score-storage";
import { trackMonthlyReviewViewed } from "@/features/nutrition/lib/nutrition-hub-analytics";

export function MonthlyNutritionReview() {
  const { t } = useTranslation();
  const { childId, ageGroupId } = useNutritionContext();
  const { entries } = useMealMemory();
  const { streak } = useNutritionTrackMeta();

  const review = useMemo(() => {
    if (!childId) return null;
    return buildMonthlyNutritionReview({
      memoryEntries: entries,
      history: getStoreHistory(childId),
      ageGroupId,
      streak,
    });
  }, [childId, entries, ageGroupId, streak]);

  useEffect(() => {
    if (review?.hasData && childId) {
      trackMonthlyReviewViewed(childId, review.monthLabel);
    }
  }, [review?.hasData, review?.monthLabel, childId]);

  if (!review?.hasData) return null;

  const trendLabel =
    review.confidenceTrend === "up"
      ? t("nutrition_hub.monthly_review.trend_up")
      : review.confidenceTrend === "down"
        ? t("nutrition_hub.monthly_review.trend_down")
        : t("nutrition_hub.monthly_review.trend_flat");

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <CalendarDays className="h-3.5 w-3.5" />
        {t("nutrition_hub.monthly_review.title", { month: review.monthLabel })}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {review.topAcceptedMeal && (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
            <p className="text-xs text-muted-foreground">{t("nutrition_hub.monthly_review.top_meal")}</p>
            <p className="font-medium text-foreground truncate">{review.topAcceptedMeal}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("nutrition_hub.monthly_review.times_accepted", { count: review.topAcceptedCount })}
            </p>
          </div>
        )}

        {review.strongestWeekLabel && (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
            <p className="text-xs text-muted-foreground">{t("nutrition_hub.monthly_review.strongest_week")}</p>
            <p className="font-medium text-foreground">{review.strongestWeekLabel}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("nutrition_hub.monthly_review.avg_score", { score: review.strongestWeekAvgScore })}
            </p>
          </div>
        )}

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
          <p className="text-xs text-muted-foreground">{t("nutrition_hub.monthly_review.confidence")}</p>
          <p className="font-medium text-foreground capitalize">{review.confidenceLevel}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{trendLabel}</p>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
          <p className="text-xs text-muted-foreground">{t("nutrition_hub.monthly_review.consistency")}</p>
          <p className="font-medium text-foreground">
            {t("nutrition_hub.monthly_review.consistency_pct", { pct: review.mealConsistencyPct })}
          </p>
        </div>
      </div>
    </div>
  );
}
