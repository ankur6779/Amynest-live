import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { NUTRITION_HUB_ACCENT, hubSectionCardClasses } from "@/lib/parent-hub-premium";
import { useNutritionConfidence } from "@/features/nutrition/hooks/use-nutrition-confidence";

export function WeeklyNutritionStory({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { story, confidence } = useNutritionConfidence();

  return (
    <div className={cn(hubSectionCardClasses(NUTRITION_HUB_ACCENT), compact ? "p-3" : "p-4 sm:p-5", "space-y-3")}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("nutrition_hub.intelligence.weekly_story")}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">{confidence.summary}</p>
      </div>

      <ul className="space-y-1.5">
        {story.wins.map((win) => (
          <li key={win} className="flex items-start gap-2 text-sm text-foreground">
            <span className="text-emerald-400 shrink-0">✓</span>
            <span>{win}</span>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
        <p className="text-xs font-semibold text-muted-foreground">
          {t("nutrition_hub.intelligence.focus_next_week")}
        </p>
        <p className="text-sm font-medium text-foreground mt-0.5">{story.focusLabel}</p>
      </div>
    </div>
  );
}
