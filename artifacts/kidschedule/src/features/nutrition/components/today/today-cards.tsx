import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { HUB_GLASS_SURFACE } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import { NUTRIENTS } from "@/lib/nutrition-data";
import {
  NUTRITION_FOCUS_CARD,
  NUTRITION_MEAL_HERO_CARD,
} from "@/features/nutrition/lib/nutrition-ui-tokens";
import { nutritionFadeUp, nutritionTapFeedback } from "@/features/nutrition/lib/nutrition-motion";
import { useNutritionConfidence } from "@/features/nutrition/hooks/use-nutrition-confidence";
import { getEvidenceForNutrient } from "@/features/nutrition/lib/nutrition-evidence";
import { useTonightMeal } from "@/features/nutrition/hooks/use-tonight-meal";
import { MealNutrientBenefits } from "@/features/nutrition/components/shared/meal-nutrient-benefits";
import { MealFeedbackButtons } from "@/features/nutrition/components/plan/meal-feedback-buttons";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";

const MEAL_ILLUSTRATIONS = ["🍽️", "🥘", "🫕", "🍲"] as const;

function mealIllustration(mealName: string): string {
  const hash = mealName.split("").reduce((n, c) => n + c.charCodeAt(0), 0);
  return MEAL_ILLUSTRATIONS[hash % MEAL_ILLUSTRATIONS.length]!;
}

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
    <motion.div
      className={cn(NUTRITION_FOCUS_CARD, "overflow-hidden")}
      variants={nutritionFadeUp}
      initial="initial"
      animate="animate"
    >
      <div
        className="pointer-events-none absolute -left-4 top-0 h-full w-24 bg-gradient-to-r from-indigo-500/10 to-transparent"
        aria-hidden
      />
      <div className="relative p-4 sm:p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200/70">
          {t("nutrition_hub.today.focus_nutrient")}
        </p>
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-400/20 text-3xl shadow-[inset_0_1px_rgba(255,255,255,0.08)]">
            {focusNutrient.emoji}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-bold text-lg text-foreground">{focusNutrient.name}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {focus.rationale || focusNutrient.tagline}
            </p>
            <p className="text-xs text-indigo-200/70 mt-1 line-clamp-2 leading-relaxed">
              {evidence.summary}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-indigo-400/25 hover:bg-indigo-500/10"
          onClick={() => openNutrientDetail(focusNutrient)}
        >
          {t("nutrition_hub.today.learn_more")}
        </Button>
      </div>
    </motion.div>
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
      <motion.div
        className={cn(
          HUB_GLASS_SURFACE,
          "border border-dashed border-amber-400/30 p-6 text-center space-y-3",
          "bg-gradient-to-br from-amber-500/[0.04] to-transparent",
        )}
        variants={nutritionFadeUp}
        initial="initial"
        animate="animate"
      >
        <span className="text-5xl block nutrition-empty-bounce" aria-hidden>
          🥗
        </span>
        <p className="font-semibold text-foreground">{t("nutrition_hub.today.meal_empty_title")}</p>
        <p className="text-sm text-muted-foreground">{t("nutrition_hub.today.meal_empty_hint")}</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab("learn")}>
            {t("nutrition_hub.today.meal_empty_learn")}
          </Button>
          <Button type="button" size="sm" onClick={() => setActiveTab("plan")}>
            {t("nutrition_hub.today.meal_empty_plan")}
          </Button>
        </div>
      </motion.div>
    );
  }

  const illustration = mealIllustration(tonight.mealName);

  return (
    <motion.div
      className={cn(NUTRITION_MEAL_HERO_CARD, "overflow-hidden")}
      variants={nutritionFadeUp}
      initial="initial"
      animate="animate"
    >
      {/* Spotlight effect */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(251,146,60,0.14),transparent_55%)]"
        aria-hidden
      />

      <div className="relative p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3">
          {/* Meal illustration area */}
          <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/15 to-amber-500/10 border border-orange-400/25 text-3xl sm:text-4xl shadow-[0_8px_24px_rgba(251,146,60,0.15)]">
            {illustration}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-200/80">
              {t("nutrition_hub.today.tonight_meal")}
            </p>
            {tonight.dayLabel && (
              <p className="text-xs text-muted-foreground mt-0.5">{tonight.dayLabel}</p>
            )}
            <p className="font-quicksand text-xl sm:text-2xl font-bold text-foreground leading-snug mt-1">
              {tonight.mealName}
            </p>
          </div>
        </div>

        <MealNutrientBenefits mealName={tonight.mealName} chipStyle />
        <MealFeedbackButtons mealName={tonight.mealName} mealSlot="dinner" compact />
        <p className="text-xs text-muted-foreground">{t("nutrition_hub.today.classic_plan_hint")}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            className="flex-1 gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 border-0 shadow-[0_4px_20px_rgba(251,146,60,0.25)]"
            onClick={handleCookTonight}
          >
            {t("nutrition_hub.today.cook_tonight")}
          </Button>
          <Button type="button" variant="outline" className="flex-1 border-orange-400/25" onClick={() => setActiveTab("plan")}>
            {t("nutrition_hub.today.see_plan")}
          </Button>
        </div>
        <motion.button
          type="button"
          onClick={handleFamily}
          className="text-xs text-orange-200/80 hover:underline text-left"
          {...nutritionTapFeedback}
        >
          {t("nutrition_hub.today.family_portions")} →
        </motion.button>
      </div>
    </motion.div>
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
