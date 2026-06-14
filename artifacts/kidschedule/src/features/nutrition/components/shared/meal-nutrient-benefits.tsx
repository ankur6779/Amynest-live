import { useTranslation } from "react-i18next";
import { mapMealToNutrients, nutrientBenefitLabels } from "@/features/nutrition/lib/meal-nutrient-map";

export function MealNutrientBenefits({
  mealName,
  compact = false,
}: {
  mealName: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const nutrients = mapMealToNutrients(mealName);
  const labels = nutrientBenefitLabels(nutrients);

  if (labels.length === 0) return null;

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5 mt-2"}>
      <p className="text-xs font-semibold text-muted-foreground">
        {t("nutrition_hub.intelligence.why_this_meal")}
      </p>
      <p className="text-xs text-muted-foreground">{t("nutrition_hub.intelligence.supports")}</p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {labels.map((label) => (
          <li key={label} className="text-xs text-emerald-200/90 flex items-center gap-1">
            <span>✓</span>
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
