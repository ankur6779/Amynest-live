import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NUTRIENTS, type AgeGroup, type Nutrient } from "@/lib/nutrition-data";
import type { AgeGroupId } from "@/lib/nutrition-data";
import { PRIORITY_NUTRIENT_IDS } from "@/features/nutrition/lib/constants";
import { NutrientCard } from "@/features/nutrition/components/learn/nutrient-card";

export function NutrientsSection({
  ageGroupId,
  activeAgeGroup,
  onSelectNutrient,
}: {
  ageGroupId: AgeGroupId;
  activeAgeGroup: AgeGroup;
  onSelectNutrient: (nutrient: Nutrient) => void;
}) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const priorityNutrients = NUTRIENTS.filter((n) =>
    (PRIORITY_NUTRIENT_IDS as readonly string[]).includes(n.id),
  );
  const secondaryNutrients = NUTRIENTS.filter(
    (n) => !(PRIORITY_NUTRIENT_IDS as readonly string[]).includes(n.id),
  );
  const visibleNutrients = showAll ? NUTRIENTS : priorityNutrients;

  return (
    <div className="space-y-3 min-w-0">
      <div>
        <h2 className="font-quicksand text-lg sm:text-[22px] font-bold tracking-tight text-foreground">
          {t("nutrition_hub.nutrients.title")}
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground mt-1">
          {t("nutrition_hub.nutrients.subtitle", { age: activeAgeGroup.label })}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 min-w-0">
        {visibleNutrients.map((n) => (
          <NutrientCard
            key={n.id}
            nutrient={n}
            ageGroupId={ageGroupId}
            compact
            onClick={() => onSelectNutrient(n)}
          />
        ))}
      </div>

      {!showAll && secondaryNutrients.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-white/15 bg-white/[0.04] hover:bg-white/[0.08]"
          onClick={() => setShowAll(true)}
        >
          {t("nutrition_hub.nutrients.show_more", { count: secondaryNutrients.length })}
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      )}

      {showAll && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={() => setShowAll(false)}
        >
          {t("nutrition_hub.nutrients.show_less")}
        </Button>
      )}
    </div>
  );
}
