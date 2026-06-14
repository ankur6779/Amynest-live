import { getMealPlan, type AgeGroupId } from "@/lib/nutrition-data";
import { cn } from "@/lib/utils";
import { Drumstick, Leaf } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { MealFeedbackButtons } from "@/features/nutrition/components/plan/meal-feedback-buttons";
import { useMealMemory } from "@/features/nutrition/hooks/use-meal-memory";
import { MealNutrientBenefits } from "@/features/nutrition/components/shared/meal-nutrient-benefits";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";

import { filterPlanDayMeals } from "@/features/nutrition/lib/meal-recommendation";

export function MealPlanSection() {
  const { t } = useTranslation();
  const { ageGroupId, foodStyle, selectedDay, setSelectedDay } = useNutritionContext();
  const { entries } = useMealMemory();
  const plan = getMealPlan(ageGroupId, foodStyle);
  const [isVeg, setIsVeg] = useState(true);

  if (!plan) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <span className="text-4xl block mb-2">🍼</span>
        <p className="font-medium">{t("nutrition_hub.breastfeeding.title")}</p>
        <p className="text-sm">{t("nutrition_hub.breastfeeding.desc")}</p>
      </div>
    );
  }

  const dayIdx = selectedDay;
  const day = plan.days[dayIdx] ?? plan.days[0];
  const rawMeal = isVeg ? day.veg : day.nonVeg;
  const meal = filterPlanDayMeals(rawMeal as Record<string, string | undefined>, entries);

  const mealTimes = [
    { time: `🌅 ${t("nutrition_hub.meals.breakfast")}`, key: "breakfast", color: "bg-muted border-border text-foreground" },
    meal.midMorning
      ? { time: `🍎 ${t("nutrition_hub.meals.mid_morning")}`, key: "midMorning", color: "bg-muted border-border text-foreground" }
      : null,
    { time: `🌞 ${t("nutrition_hub.meals.lunch")}`, key: "lunch", color: "bg-muted border-border text-foreground" },
    { time: `🍪 ${t("nutrition_hub.meals.snack")}`, key: "snack", color: "bg-muted border-border text-foreground" },
    { time: `🌙 ${t("nutrition_hub.meals.dinner")}`, key: "dinner", color: "bg-muted border-border text-foreground" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-lg">{plan.ageCategory}</h3>
        <div className="flex rounded-full border overflow-hidden">
          <button
            type="button"
            onClick={() => setIsVeg(true)}
            className={cn(
              "flex items-center gap-1 px-4 py-1.5 text-sm font-medium transition-colors",
              isVeg ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground",
            )}
          >
            <Leaf className="h-3.5 w-3.5" /> {t("nutrition_hub.veg")}
          </button>
          <button
            type="button"
            onClick={() => setIsVeg(false)}
            className={cn(
              "flex items-center gap-1 px-4 py-1.5 text-sm font-medium transition-colors",
              !isVeg ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground",
            )}
          >
            <Drumstick className="h-3.5 w-3.5" /> {t("nutrition_hub.non_veg")}
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-muted border border-border p-3 text-sm">
        <p className="text-foreground">
          📏 <strong>{t("nutrition_hub.portions_label")}</strong> {plan.portionNote}
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {plan.days.map((d, i) => (
          <button
            key={d.day}
            type="button"
            onClick={() => setSelectedDay(i)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-semibold border transition-colors",
              dayIdx === i
                ? "border-[rgba(255,184,0,0.55)] bg-[rgba(255,184,0,0.14)] text-foreground"
                : "border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:bg-white/[0.06]",
            )}
          >
            {d.day.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 min-w-0">
        {mealTimes.filter(Boolean).map((item) => {
          const m = item as { time: string; key: string; color: string };
          const mealText = (meal as Record<string, string | undefined>)[m.key];
          return (
            <div key={m.key} className={cn("rounded-xl border p-3", m.color)}>
              <p className="text-xs font-bold mb-1.5">{m.time}</p>
              <p className="text-sm leading-snug">{mealText ?? "—"}</p>
              {mealText ? <MealNutrientBenefits mealName={mealText} compact /> : null}
              {mealText ? (
                <MealFeedbackButtons mealName={mealText.replace(/ \(try a smaller portion\)$/, "")} mealSlot={m.key} compact />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
