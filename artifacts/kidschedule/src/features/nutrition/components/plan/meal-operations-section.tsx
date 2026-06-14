import { useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useListChildren } from "@workspace/api-client-react";
import { useSubscription } from "@/hooks/use-subscription";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { useMealMemory } from "@/features/nutrition/hooks/use-meal-memory";
import { collectWeekLunches, collectWeekMeals } from "@/features/nutrition/lib/household-grocery";
import { generateGroceryList } from "@/features/nutrition/lib/grocery-generator";
import { generateMealPrepSuggestions } from "@/features/nutrition/lib/meal-prep";
import {
  getIndiaSeason,
  getSeasonalFoodTips,
  seasonalHighlight,
} from "@/features/nutrition/lib/seasonal-foods";
import { planSchoolTiffinWeek, isSchoolAgeBand } from "@/features/nutrition/lib/tiffin-planner";
import { GroceryList } from "@/features/nutrition/components/grocery/grocery-list";
import { ShoppingMode } from "@/features/nutrition/components/grocery/shopping-mode";
import { TiffinWeekView } from "@/features/nutrition/components/tiffin/tiffin-week-view";
import { HouseholdGroceryBoard } from "@/features/nutrition/components/grocery/household-grocery-board";
import { shouldShowHouseholdBoard } from "@/features/nutrition/lib/household-aggregation";
import {
  trackGroceryGenerated,
  trackGroceryOpened,
  trackTiffinOpened,
} from "@/features/nutrition/lib/nutrition-hub-analytics";

export function MealOperationsSection() {
  const { t } = useTranslation();
  const { ageGroupId, foodStyle, childId } = useNutritionContext();
  const { entries } = useMealMemory();
  const { data: children = [] } = useListChildren();
  const { isPremium } = useSubscription();

  const weekMeals = useMemo(
    () => collectWeekMeals(ageGroupId, foodStyle),
    [ageGroupId, foodStyle],
  );

  const weekLunches = useMemo(
    () => collectWeekLunches(ageGroupId, foodStyle),
    [ageGroupId, foodStyle],
  );

  const familySize = Math.max(2, children.length + 2);

  const groceryGroups = useMemo(
    () =>
      generateGroceryList({
        weekMeals,
        familySize,
        memoryEntries: entries,
      }),
    [weekMeals, familySize, entries],
  );

  const tiffinDays = useMemo(
    () =>
      planSchoolTiffinWeek({
        ageGroupId,
        foodStyle,
        weekLunches,
        memoryEntries: entries,
      }),
    [ageGroupId, foodStyle, weekLunches, entries],
  );

  const prepTasks = useMemo(() => generateMealPrepSuggestions(weekMeals), [weekMeals]);

  const season = getIndiaSeason();
  const seasonTips = getSeasonalFoodTips(season);
  const seasonSample = weekMeals.find((m) => seasonalHighlight(m, season));

  const shoppingKey = childId ? `child-${childId}` : "default";
  const groceryOpenedRef = useRef(false);
  const tiffinOpenedRef = useRef(false);

  useEffect(() => {
    if (!childId || weekMeals.length === 0 || groceryOpenedRef.current) return;
    groceryOpenedRef.current = true;
    trackGroceryOpened(childId);
    const itemCount = groceryGroups.reduce((n, g) => n + g.items.length, 0);
    if (itemCount > 0) trackGroceryGenerated(childId, itemCount);
  }, [childId, weekMeals.length, groceryGroups]);

  useEffect(() => {
    if (!childId || !isSchoolAgeBand(ageGroupId) || tiffinOpenedRef.current) return;
    tiffinOpenedRef.current = true;
    trackTiffinOpened(childId);
  }, [childId, ageGroupId]);

  if (weekMeals.length === 0) return null;

  return (
    <div className="space-y-6 pt-6 border-t border-white/[0.08]">
      <div>
        <h3 className="font-bold text-base text-foreground">
          {t("nutrition_hub.operations.title")}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("nutrition_hub.operations.subtitle")}
        </p>
      </div>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("nutrition_hub.operations.season_title", { season: t(`nutrition_hub.operations.season_${season}`) })}
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
          {seasonTips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        {seasonSample && seasonalHighlight(seasonSample, season) && (
          <p className="text-xs text-primary/90 italic">
            {seasonSample}: {seasonalHighlight(seasonSample, season)}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("nutrition_hub.operations.grocery_title")}
        </p>
        <GroceryList groups={groceryGroups} />
        {isPremium && <ShoppingMode groups={groceryGroups} householdId={shoppingKey} />}
      </section>

      {isSchoolAgeBand(ageGroupId) && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("nutrition_hub.operations.tiffin_title")}
          </p>
          <p className="text-sm text-muted-foreground">{t("nutrition_hub.operations.tiffin_desc")}</p>
          <TiffinWeekView days={tiffinDays} />
        </section>
      )}

      {prepTasks.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("nutrition_hub.operations.prep_title")}
          </p>
          <ul className="space-y-2">
            {prepTasks.map((task) => (
              <li
                key={task.id}
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5"
              >
                <p className="text-sm font-medium text-foreground">{task.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{task.detail}</p>
                <span className="text-[10px] uppercase text-primary/80 mt-1 inline-block">
                  {task.dayHint}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {shouldShowHouseholdBoard(children.length) && (
        <HouseholdGroceryBoard />
      )}
    </div>
  );
}
