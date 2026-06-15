import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useListChildren } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";
import { NUTRITION_HUB_ACCENT, hubSectionCardClasses } from "@/lib/parent-hub-premium";
import { monthsToAgeGroupId } from "@/features/nutrition/lib/age-band-map";
import { shouldShowHouseholdBoard } from "@/features/nutrition/lib/household-aggregation";
import { buildHouseholdGrocery, buildHouseholdTiffinPlans } from "@/features/nutrition/lib/household-grocery";
import { resolveHouseholdSize } from "@/features/nutrition/lib/grocery-household-size";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { loadMealMemoryEntries } from "@/features/nutrition/lib/nutrition-memory-sync";
import { schoolLunchTermI18nKey } from "@workspace/nutrition-localization";
import { useParentNutritionProfile } from "@/features/nutrition/hooks/use-parent-nutrition-profile";
import { GroceryList } from "@/features/nutrition/components/grocery/grocery-list";
import { ShoppingMode } from "@/features/nutrition/components/grocery/shopping-mode";
import { TiffinWeekView } from "@/features/nutrition/components/tiffin/tiffin-week-view";

function childAgeMonths(c: { age: number; ageMonths?: number | null }): number {
  return c.age * 12 + (c.ageMonths ?? 0);
}

export function HouseholdGroceryBoard() {
  const { t } = useTranslation();
  const { data: children = [] } = useListChildren();
  const { foodStyle, countryProfile } = useParentNutritionProfile();
  const { isPremium } = useSubscription();
  const { openPaywall } = usePaywall();
  const { classicPlanIsVeg } = useNutritionContext();

  const childPlans = useMemo(
    () =>
      children.map((c) => ({
        childId: c.id,
        name: c.name,
        ageGroupId: monthsToAgeGroupId(childAgeMonths(c)),
        foodStyle,
        countryProfile,
        memoryEntries: loadMealMemoryEntries(c.id),
      })),
    [children, foodStyle, countryProfile],
  );

  const groceryGroups = useMemo(
    () => buildHouseholdGrocery(childPlans, resolveHouseholdSize(children.length), classicPlanIsVeg, countryProfile),
    [childPlans, children.length, classicPlanIsVeg, countryProfile],
  );

  const tiffinPlans = useMemo(
    () => buildHouseholdTiffinPlans(childPlans, classicPlanIsVeg),
    [childPlans, classicPlanIsVeg],
  );

  if (!shouldShowHouseholdBoard(children.length)) return null;

  const locked = !isPremium;
  const householdId = `household-${children.map((c) => c.id).join("-")}`;

  return (
    <div className={cn(hubSectionCardClasses(NUTRITION_HUB_ACCENT), "overflow-hidden relative mt-4")}>
      {locked && (
        <button
          type="button"
          className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => openPaywall("hub_nutrition")}
        >
          <span className="text-sm font-medium text-foreground">
            {t("nutrition_hub.operations.household_grocery_premium")}
          </span>
        </button>
      )}
      <div className="p-4 sm:p-5 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("nutrition_hub.operations.household_grocery_title")}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t(schoolLunchTermI18nKey(countryProfile.schoolLunchTerm, "household_grocery_desc"))}
          </p>
        </div>

        <div className={cn(locked && "blur-[2px] select-none pointer-events-none")}>
          <GroceryList groups={groceryGroups} premiumLocked={false} />

          {!locked && groceryGroups.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/[0.08]">
              <ShoppingMode groups={groceryGroups} householdId={householdId} />
            </div>
          )}

          {tiffinPlans.length > 1 && (
            <div className="mt-6 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(schoolLunchTermI18nKey(countryProfile.schoolLunchTerm, "household"))}
              </p>
              {tiffinPlans.map((plan) => (
                <div key={plan.childId}>
                  <p className="text-sm font-semibold text-foreground mb-2">{plan.name}</p>
                  <TiffinWeekView days={plan.days} premiumLocked={false} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
