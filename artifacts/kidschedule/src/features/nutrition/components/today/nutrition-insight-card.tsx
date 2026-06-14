import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNutritionConfidence } from "@/features/nutrition/hooks/use-nutrition-confidence";
import {
  buildInsightCandidates,
  selectOneInsight,
} from "@/features/nutrition/lib/nutrition-story";
import { aggregateChecklistHits } from "@/features/nutrition/lib/focus-nutrient-engine";
import { useNutritionDailyScore } from "@/features/nutrition/hooks/use-nutrition-daily-score";
import { useNutritionTrackMeta } from "@/features/nutrition/hooks/use-nutrition-track-meta";
import { dateKeyLocal, loadNutritionScoreStore } from "@/features/nutrition/lib/nutrition-score-storage";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";

const INSIGHT_SESSION_KEY = "nutrition:insight-shown";

function sessionInsightKey(): string {
  return `${INSIGHT_SESSION_KEY}:${dateKeyLocal()}`;
}

export function NutritionInsightCard() {
  const { t } = useTranslation();
  const { childId } = useNutritionContext();
  const { confidence, focus } = useNutritionConfidence();
  const { checkList } = useNutritionDailyScore();
  const { streak, weeklyTrend } = useNutritionTrackMeta();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem(sessionInsightKey())) {
      setVisible(false);
      return;
    }

    const todayKey = dateKeyLocal();
    const dayChecklists = childId ? loadNutritionScoreStore(childId).dayChecklists : undefined;
    const { checklistHits, daysLogged } = aggregateChecklistHits(
      weeklyTrend,
      checkList,
      todayKey,
      dayChecklists,
    );

    const candidates = buildInsightCandidates({
      weeklyTrend,
      streak,
      focusNutrientId: focus.nutrientId,
      checklistHits,
      daysLogged,
      confidenceLevel: confidence.confidenceLevel,
    });

    const picked = selectOneInsight(candidates);
    if (picked) {
      setMessage(picked);
      setVisible(true);
      sessionStorage.setItem(sessionInsightKey(), "1");
    }
  }, [childId, weeklyTrend, streak, checkList, focus.nutrientId, confidence.confidenceLevel]);

  if (!visible || !message) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 flex items-start gap-3",
      )}
    >
      <Lightbulb className="h-4 w-4 text-emerald-300 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/90">
          {t("nutrition_hub.intelligence.insight_title")}
        </p>
        <p className="text-sm text-foreground mt-0.5">{message}</p>
      </div>
    </div>
  );
}
