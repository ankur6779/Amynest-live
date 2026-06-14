import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { HUB_GLASS_SURFACE, NUTRITION_HUB_ACCENT, hubSectionCardClasses } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import { NUTRIENTS } from "@/lib/nutrition-data";
import { useNutritionConfidence } from "@/features/nutrition/hooks/use-nutrition-confidence";
import { getEvidenceForNutrient } from "@/features/nutrition/lib/nutrition-evidence";
import { useTonightMeal } from "@/features/nutrition/hooks/use-tonight-meal";
import { MealNutrientBenefits } from "@/features/nutrition/components/shared/meal-nutrient-benefits";
import { MealFeedbackButtons } from "@/features/nutrition/components/plan/meal-feedback-buttons";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";

export function FocusNutrientCard() {
  const { t } = useTranslation();
  const { ageGroupId, openNutrientDetail } = useNutritionContext();
  const { focus } = useNutritionConfidence();

  const focusNutrient =
    NUTRIENTS.find((n) => n.id === focus.nutrientId) ??
    NUTRIENTS.find((n) => n.id === "iron") ??
    NUTRIENTS[0]!;

  const evidence = getEvidenceForNutrient(focus.nutrientId, ageGroupId);

  return (
    <div className={cn(hubSectionCardClasses(NUTRITION_HUB_ACCENT), "overflow-hidden")}>
      <div className="p-4 sm:p-5 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("nutrition_hub.today.focus_nutrient")}
        </p>
        <div className="flex items-start gap-3">
          <span className="text-3xl">{focusNutrient.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-foreground">{focusNutrient.name}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{focus.rationale || focusNutrient.tagline}</p>
            <p className="text-xs text-emerald-200/80 mt-1 line-clamp-2">{evidence.summary}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => openNutrientDetail(focusNutrient)}
        >
          {t("nutrition_hub.today.learn_more")}
        </Button>
      </div>
    </div>
  );
}

export function TonightMealHero() {
  const { t } = useTranslation();
  const { ageGroupId, foodStyle, setSuggestedMeal, setActiveTab, childId } = useNutritionContext();
  const tonight = useTonightMeal(ageGroupId, foodStyle, childId);

  const handleCookTonight = () => {
    if (tonight.mealName) setSuggestedMeal(tonight.mealName);
    setActiveTab("plan");
  };

  const handleFamily = () => {
    if (tonight.mealName) setSuggestedMeal(tonight.mealName);
    setActiveTab("family");
  };

  if (!tonight.hasPlan || !tonight.mealName) {
    return (
      <div className={cn(HUB_GLASS_SURFACE, "border border-dashed border-emerald-400/35 p-6 text-center space-y-3")}>
        <span className="text-4xl block">🍼</span>
        <p className="font-semibold text-foreground">{t("nutrition_hub.breastfeeding.title")}</p>
        <p className="text-sm text-muted-foreground">{t("nutrition_hub.breastfeeding.desc")}</p>
        <p className="text-xs text-muted-foreground">{t("nutrition_hub.today.meal_empty_hint")}</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab("learn")}>
            {t("nutrition_hub.today.meal_empty_learn")}
          </Button>
          <Button type="button" size="sm" onClick={() => setActiveTab("plan")}>
            {t("nutrition_hub.today.meal_empty_plan")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(hubSectionCardClasses(NUTRITION_HUB_ACCENT), "overflow-hidden")}>
      <div className="p-4 sm:p-5 space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300/90">
            {t("nutrition_hub.today.tonight_meal")}
          </p>
          {tonight.dayLabel && <p className="text-xs text-muted-foreground">{tonight.dayLabel}</p>}
        </div>
        <p className="font-quicksand text-xl sm:text-2xl font-bold text-foreground leading-snug">
          {tonight.mealName}
        </p>
        <MealNutrientBenefits mealName={tonight.mealName} />
        <MealFeedbackButtons mealName={tonight.mealName} mealSlot="dinner" compact />
        <p className="text-xs text-muted-foreground">{t("nutrition_hub.today.classic_plan_hint")}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button type="button" className="flex-1 gap-2" onClick={handleCookTonight}>
            {t("nutrition_hub.today.cook_tonight")}
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={() => setActiveTab("plan")}>
            {t("nutrition_hub.today.see_plan")}
          </Button>
        </div>
        <button type="button" onClick={handleFamily} className="text-xs text-emerald-200/80 hover:underline text-left">
          {t("nutrition_hub.today.family_portions")} →
        </button>
      </div>
    </div>
  );
}

export function FamilyMealShortcut() {
  const { t } = useTranslation();
  const { suggestedMeal, setActiveTab, ageGroupId, foodStyle, setSuggestedMeal, childId } = useNutritionContext();
  const tonight = useTonightMeal(ageGroupId, foodStyle, childId);
  const meal = suggestedMeal || tonight.mealName;

  if (!meal) return null;

  return (
    <div className="rounded-xl border border-white/[0.1] bg-white/[0.04] p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{t("nutrition_hub.today.family_shortcut")}</p>
        <p className="text-sm font-semibold text-foreground truncate">{meal}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => {
          setSuggestedMeal(meal);
          setActiveTab("family");
        }}
      >
        {t("nutrition_hub.today.portions")}
      </Button>
    </div>
  );
}
