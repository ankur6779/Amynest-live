import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MealFeedbackButtons } from "@/features/nutrition/components/plan/meal-feedback-buttons";
import { MealNutrientBenefits } from "@/features/nutrition/components/shared/meal-nutrient-benefits";
import {
  mapMealToNutrients,
  nutrientBenefitLabels,
} from "@/features/nutrition/lib/meal-nutrient-map";

export function MealPlanSlotCard({
  time,
  mealText,
  mealSlot,
  colorClass,
}: {
  time: string;
  mealText: string | undefined;
  mealSlot: string;
  colorClass: string;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const cleanName = mealText?.replace(/ \(try a smaller portion\)$/, "") ?? "";
  const badges = mealText ? nutrientBenefitLabels(mapMealToNutrients(mealText)) : [];
  const hasDetails = badges.length > 0;

  if (!mealText) {
    return (
      <div className={cn("rounded-xl border p-3", colorClass)}>
        <p className="text-xs font-bold mb-1.5">{time}</p>
        <p className="text-sm leading-snug">—</p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border p-3", colorClass)} data-testid="meal-plan-slot-card">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold mb-1">{time}</p>
          <p className="text-sm leading-snug font-medium">{mealText}</p>
          {hasDetails && (
            <ul className="flex flex-wrap gap-1 mt-1.5">
              {badges.map((label) => (
                <li
                  key={label}
                  className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-200/90"
                >
                  {label}
                </li>
              ))}
            </ul>
          )}
        </div>
        {hasDetails && (
          <button
            type="button"
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={
              expanded
                ? t("nutrition_hub.plan.collapse_meal_details")
                : t("nutrition_hub.plan.expand_meal_details")
            }
            data-testid="meal-plan-slot-expand"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </button>
        )}
      </div>

      {expanded && hasDetails ? (
        <div className="mt-2 pt-2 border-t border-white/[0.06]">
          <MealNutrientBenefits mealName={mealText} compact />
        </div>
      ) : null}

      <MealFeedbackButtons mealName={cleanName} mealSlot={mealSlot} compact />
    </div>
  );
}
