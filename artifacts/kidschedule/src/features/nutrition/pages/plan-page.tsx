import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  HUB_BODY,
  HUB_SECTION_TITLE,
  NUTRITION_HUB_ACCENT,
  hubAccentBarClasses,
  hubSectionCardClasses,
} from "@/lib/parent-hub-premium";
import { AIMealPlanSection } from "@/features/nutrition/components/plan/ai-meal-plan-section";
import { MealOperationsSection } from "@/features/nutrition/components/plan/meal-operations-section";
import { MealPlanSection } from "@/features/nutrition/components/plan/meal-plan-section";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";

export function PlanPage() {
  const { t } = useTranslation();
  const { planSource, setPlanSource } = useNutritionContext();

  return (
    <div className={cn(hubSectionCardClasses(NUTRITION_HUB_ACCENT), "hub-page-enter overflow-hidden")}>
      <div className="flex">
        <div className={hubAccentBarClasses(NUTRITION_HUB_ACCENT)} />
        <div className="min-w-0 flex-1 p-4 sm:p-6 space-y-4">
          <div>
            <h2 className={HUB_SECTION_TITLE}>{t("nutrition_hub.tabs.meals")}</h2>
            <p className={HUB_BODY}>{t("nutrition_hub.ai_plan.subtitle")}</p>
          </div>

          <div className="flex rounded-full border border-white/[0.1] overflow-hidden w-fit">
            <button
              type="button"
              onClick={() => setPlanSource("classic")}
              className={cn(
                "px-4 py-1.5 text-sm font-medium transition-colors",
                planSource === "classic"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-white/[0.05] text-muted-foreground",
              )}
            >
              {t("nutrition_hub.plan.classic")}
            </button>
            <button
              type="button"
              onClick={() => setPlanSource("smart")}
              className={cn(
                "px-4 py-1.5 text-sm font-medium transition-colors",
                planSource === "smart"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-white/[0.05] text-muted-foreground",
              )}
            >
              {t("nutrition_hub.plan.smart")}
            </button>
          </div>

          {planSource === "classic" ? <MealPlanSection /> : <AIMealPlanSection />}
          <MealOperationsSection />
        </div>
      </div>
    </div>
  );
}
