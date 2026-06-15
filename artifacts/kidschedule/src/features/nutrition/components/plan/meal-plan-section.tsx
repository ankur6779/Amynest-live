import { getMealPlan } from "@/lib/nutrition-data";
import { localizePortionNote } from "@workspace/nutrition-localization";
import { cn } from "@/lib/utils";
import { Drumstick, Leaf } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { useMealMemory } from "@/features/nutrition/hooks/use-meal-memory";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { MealPlanDaySelector } from "@/features/nutrition/components/plan/meal-plan-day-selector";
import { MealPlanSlotCard } from "@/features/nutrition/components/plan/meal-plan-slot-card";
import { PlanExportActions } from "@/features/nutrition/components/plan/plan-export-actions";
import { filterPlanDayMeals } from "@/features/nutrition/lib/meal-recommendation";
import type { MealPlanDayExport } from "@/features/nutrition/lib/plan-meal-export";

export function MealPlanSection() {
  const { t } = useTranslation();
  const { ageGroupId, foodStyle, selectedDay, setSelectedDay, classicPlanIsVeg, setClassicPlanIsVeg, countryProfile } =
    useNutritionContext();
  const { entries } = useMealMemory();
  const plan = getMealPlan(ageGroupId, foodStyle, countryProfile);
  const isVeg = classicPlanIsVeg;

  const exportDays = useMemo((): MealPlanDayExport[] => {
    if (!plan) return [];
    return plan.days.map((d) => {
      const raw = isVeg ? d.veg : d.nonVeg;
      const filtered = filterPlanDayMeals(raw as Record<string, string | undefined>, entries);
      return {
        dayLabel: d.day,
        meals: {
          breakfast: filtered.breakfast,
          midMorning: filtered.midMorning,
          lunch: filtered.lunch,
          snack: filtered.snack,
          dinner: filtered.dinner,
        },
      };
    });
  }, [plan, isVeg, entries]);

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

  const dayLabels = plan.days.map((d) => d.day.slice(0, 3));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-lg">{plan.ageCategory}</h3>
        <div className="flex rounded-full border overflow-hidden">
          <button
            type="button"
            onClick={() => setClassicPlanIsVeg(true)}
            className={cn(
              "flex items-center gap-1 px-4 py-1.5 text-sm font-medium transition-colors",
              isVeg ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground",
            )}
          >
            <Leaf className="h-3.5 w-3.5" /> {t("nutrition_hub.veg")}
          </button>
          <button
            type="button"
            onClick={() => setClassicPlanIsVeg(false)}
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
          📏 <strong>{t("nutrition_hub.portions_label")}</strong> {localizePortionNote(plan.portionNote, countryProfile)}
        </p>
      </div>

      <PlanExportActions ageCategory={plan.ageCategory} isVeg={isVeg} days={exportDays} />

      <MealPlanDaySelector
        labels={dayLabels}
        selectedIndex={dayIdx}
        onSelect={setSelectedDay}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 min-w-0">
        {mealTimes.filter(Boolean).map((item) => {
          const m = item as { time: string; key: string; color: string };
          const mealText = (meal as Record<string, string | undefined>)[m.key];
          return (
            <MealPlanSlotCard
              key={m.key}
              time={m.time}
              mealText={mealText}
              mealSlot={m.key}
              colorClass={m.color}
            />
          );
        })}
      </div>
    </div>
  );
}
