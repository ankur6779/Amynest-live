import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { NutritionLibrarySection } from "@/components/nutrition-library/nutrition-library-section";
import { NutrientsSection } from "@/features/nutrition/components/learn/nutrients-section";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";

export function LearnPage() {
  const { t } = useTranslation();
  const { ageGroupId, activeAgeGroup, openNutrientDetail } = useNutritionContext();
  const [segment, setSegment] = useState<"nutrients" | "guides">("nutrients");

  return (
    <div className="space-y-3 sm:space-y-4 hub-page-enter">
      <div className="flex rounded-full border border-white/[0.1] overflow-hidden w-fit">
        <button
          type="button"
          onClick={() => setSegment("nutrients")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium transition-colors",
            segment === "nutrients"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-white/[0.05] text-muted-foreground",
          )}
        >
          {t("nutrition_hub.tabs.nutrients")}
        </button>
        <button
          type="button"
          onClick={() => setSegment("guides")}
          className={cn(
            "px-4 py-1.5 text-sm font-medium transition-colors",
            segment === "guides"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-white/[0.05] text-muted-foreground",
          )}
        >
          {t("nutrition_hub.tabs.library")}
        </button>
      </div>

      {segment === "nutrients" ? (
        <div className="min-w-0">
          <NutrientsSection
            ageGroupId={ageGroupId}
            activeAgeGroup={activeAgeGroup}
            onSelectNutrient={openNutrientDetail}
          />
        </div>
      ) : (
        <NutritionLibrarySection />
      )}
    </div>
  );
}
