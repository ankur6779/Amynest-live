import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useListChildren } from "@workspace/api-client-react";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { useMealMemory } from "@/features/nutrition/hooks/use-meal-memory";
import { monthsToAgeGroupId } from "@/features/nutrition/lib/age-band-map";
import { buildChildNutritionSnapshot } from "@/features/nutrition/lib/household-aggregation";
import { buildNutritionPremiumPreview } from "@/features/nutrition/lib/nutrition-premium-preview";
import { resolveHouseholdSize } from "@/features/nutrition/lib/grocery-household-size";
import { loadMealMemoryEntries } from "@/features/nutrition/lib/nutrition-memory-sync";
import { dateKeyLocal } from "@/features/nutrition/lib/nutrition-score-storage";
import { useParentNutritionProfile } from "@/features/nutrition/hooks/use-parent-nutrition-profile";
import { trackPremiumPreviewViewed } from "@/features/nutrition/lib/nutrition-hub-analytics";
import { isNutritionLivingV1Enabled } from "@/lib/nutrition/living-room";

function childAgeMonths(c: { age: number; ageMonths?: number | null }): number {
  return c.age * 12 + (c.ageMonths ?? 0);
}

export function NutritionPremiumPreview() {
  const { t } = useTranslation();
  const { childId, ageGroupId, classicPlanIsVeg } = useNutritionContext();
  const { foodStyle, countryProfile } = useParentNutritionProfile();
  const { entries } = useMealMemory();
  const { data: children = [] } = useListChildren();
  const { isPremium } = useSubscription();
  const { openPaywall } = usePaywall();
  const todayKey = dateKeyLocal();
  const living = isNutritionLivingV1Enabled();

  const preview = useMemo(() => {
    const householdRows = children.map((c) =>
      buildChildNutritionSnapshot({
        childId: c.id,
        name: c.name,
        ageGroupId: monthsToAgeGroupId(childAgeMonths(c)),
        todayKey,
        memoryEntries: loadMealMemoryEntries(c.id),
      }),
    );

    return buildNutritionPremiumPreview({
      householdRows,
      ageGroupId,
      foodStyle,
      memoryEntries: entries,
      familySize: resolveHouseholdSize(children.length),
      isVeg: classicPlanIsVeg,
      countryProfile,
    });
  }, [children, todayKey, ageGroupId, foodStyle, entries, classicPlanIsVeg, countryProfile]);

  useEffect(() => {
    if (living) return;
    if (!isPremium && preview.hasData && childId) {
      trackPremiumPreviewViewed(childId, "nutrition_hub");
    }
  }, [living, isPremium, preview.hasData, childId]);

  /** Living manufacturing — no Crown / blur shelf on Care opening */
  if (living || isPremium || !preview.hasData) return null;

  return (
    <div className="relative rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
      <button
        type="button"
        className="w-full text-left p-4 space-y-3"
        onClick={() => openPaywall("hub_nutrition")}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          <Crown className="h-3.5 w-3.5" />
          {t("nutrition_hub.premium_preview.title")}
        </p>
        <p className="text-sm text-muted-foreground">{t("nutrition_hub.premium_preview.subtitle")}</p>

        <div className={cn("space-y-2 blur-[1px] select-none pointer-events-none")}>
          {preview.householdRows.length > 1 && (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">
                {t("nutrition_hub.premium_preview.household")}
              </p>
              {preview.householdRows.slice(0, 2).map((row) => (
                <p key={row.childId} className="text-xs text-foreground truncate">
                  {row.name} — NCI {row.confidenceScore}, {row.focusNutrient}
                </p>
              ))}
            </div>
          )}

          {preview.groceryHighlights.length > 0 && (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">
                {t("nutrition_hub.premium_preview.grocery")}
              </p>
              <p className="text-xs text-foreground">{preview.groceryHighlights.join(" · ")}</p>
            </div>
          )}

          {preview.shareMealPreview && (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] uppercase text-muted-foreground mb-1">
                {t("nutrition_hub.premium_preview.share")}
              </p>
              <p className="text-xs text-foreground truncate">{preview.shareMealPreview}</p>
            </div>
          )}
        </div>

        <span className="inline-block text-sm font-medium text-primary">
          {t("nutrition_hub.premium_preview.cta")}
        </span>
      </button>
    </div>
  );
}
