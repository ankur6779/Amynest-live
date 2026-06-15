import { useMemo, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useListChildren } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { useMealMemory } from "@/features/nutrition/hooks/use-meal-memory";
import { collectWeekLunches, collectWeekMeals } from "@/features/nutrition/lib/household-grocery";
import { generateGroceryList } from "@/features/nutrition/lib/grocery-generator";
import { generateMealPrepSuggestions } from "@/features/nutrition/lib/meal-prep";
import {
  getSeasonForCountry,
  getSeasonalFoodTips,
  seasonalHighlight,
  seasonDisplayKey,
} from "@/features/nutrition/lib/seasonal-foods";
import { planSchoolTiffinWeek, isSchoolAgeBand, schoolLunchLabel } from "@/features/nutrition/lib/tiffin-planner";
import { schoolLunchTermI18nKey } from "@workspace/nutrition-localization";
import { GroceryList } from "@/features/nutrition/components/grocery/grocery-list";
import { ShoppingMode } from "@/features/nutrition/components/grocery/shopping-mode";
import { TiffinWeekView } from "@/features/nutrition/components/tiffin/tiffin-week-view";
import { HouseholdGroceryBoard } from "@/features/nutrition/components/grocery/household-grocery-board";
import { shouldShowHouseholdBoard } from "@/features/nutrition/lib/household-aggregation";
import { resolveHouseholdSize } from "@/features/nutrition/lib/grocery-household-size";
import {
  trackGroceryGenerated,
  trackGroceryOpened,
  trackTiffinGenerated,
  trackTiffinOpened,
} from "@/features/nutrition/lib/nutrition-hub-analytics";

type OperationsTab = "groceries" | "tiffin" | "prep" | "household";

const TAB_IDS: OperationsTab[] = ["groceries", "tiffin", "prep", "household"];

export function MealOperationsSection() {
  const { t } = useTranslation();
  const { ageGroupId, foodStyle, childId, classicPlanIsVeg, countryProfile } = useNutritionContext();
  const { entries } = useMealMemory();
  const { data: children = [] } = useListChildren();
  const { isPremium } = useSubscription();
  const [activeTab, setActiveTab] = useState<OperationsTab>("groceries");

  const weekMeals = useMemo(
    () => collectWeekMeals(ageGroupId, foodStyle, classicPlanIsVeg, countryProfile),
    [ageGroupId, foodStyle, classicPlanIsVeg, countryProfile],
  );

  const weekLunches = useMemo(
    () => collectWeekLunches(ageGroupId, foodStyle, classicPlanIsVeg, countryProfile),
    [ageGroupId, foodStyle, classicPlanIsVeg, countryProfile],
  );

  const familySize = resolveHouseholdSize(children.length);

  const groceryGroups = useMemo(
    () =>
      generateGroceryList({
        weekMeals,
        familySize,
        memoryEntries: entries,
        countryProfile,
      }),
    [weekMeals, familySize, entries, countryProfile],
  );

  const tiffinDays = useMemo(
    () =>
      planSchoolTiffinWeek({
        ageGroupId,
        foodStyle,
        weekLunches,
        countryProfile,
        memoryEntries: entries,
      }),
    [ageGroupId, foodStyle, weekLunches, entries, countryProfile],
  );

  const prepTasks = useMemo(
    () => generateMealPrepSuggestions(weekMeals, countryProfile),
    [weekMeals, countryProfile],
  );

  const season = getSeasonForCountry(countryProfile);
  const seasonTips = getSeasonalFoodTips(season, countryProfile);
  const seasonSample = weekMeals.find((m) => seasonalHighlight(m, season, countryProfile));
  const lunchLabel = schoolLunchLabel(countryProfile);
  const lunchTerm = countryProfile.schoolLunchTerm;

  const operationsTabLabel = (tab: OperationsTab) => {
    if (tab === "tiffin") return t(schoolLunchTermI18nKey(lunchTerm, "tab"));
    return t(`nutrition_hub.operations.tab_${tab}`);
  };

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
    if (tiffinDays.length > 0) trackTiffinGenerated(childId, tiffinDays.length);
  }, [childId, ageGroupId, tiffinDays.length]);

  if (weekMeals.length === 0) return null;

  const showHousehold = shouldShowHouseholdBoard(children.length);

  return (
    <div className="space-y-4 pt-6 border-t border-white/[0.08]">
      <div>
        <h3 className="font-bold text-base text-foreground">
          {t("nutrition_hub.operations.title")}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t(schoolLunchTermI18nKey(lunchTerm, "operations_subtitle"))}
        </p>
      </div>

      <div
        className="flex gap-1 overflow-x-auto no-scrollbar rounded-full border border-white/[0.1] p-1 bg-[rgba(18,28,60,0.5)]"
        role="tablist"
        aria-label={t("nutrition_hub.operations.title")}
        data-testid="meal-operations-tabs"
      >
        {TAB_IDS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-white/[0.05]",
            )}
            data-testid={`meal-operations-tab-${tab}`}
          >
            {operationsTabLabel(tab)}
          </button>
        ))}
      </div>

      {activeTab === "groceries" && (
        <section className="space-y-4" role="tabpanel" data-testid="meal-operations-panel-groceries">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("nutrition_hub.operations.season_title", {
                season: t(`nutrition_hub.operations.season_${seasonDisplayKey(season)}`),
              })}
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
              {seasonTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
            {seasonSample && seasonalHighlight(seasonSample, season, countryProfile) && (
              <p className="text-xs text-primary/90 italic">
                {seasonSample}: {seasonalHighlight(seasonSample, season, countryProfile)}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("nutrition_hub.operations.grocery_title")}
            </p>
            <GroceryList groups={groceryGroups} />
            {isPremium && <ShoppingMode groups={groceryGroups} householdId={shoppingKey} />}
          </div>
        </section>
      )}

      {activeTab === "tiffin" && (
        <section className="space-y-3" role="tabpanel" data-testid="meal-operations-panel-tiffin">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {lunchLabel}
          </p>
          <p className="text-sm text-muted-foreground">{t(schoolLunchTermI18nKey(lunchTerm, "desc"))}</p>
          {isSchoolAgeBand(ageGroupId) ? (
            <TiffinWeekView days={tiffinDays} />
          ) : (
            <p className="text-sm text-muted-foreground">{t(schoolLunchTermI18nKey(lunchTerm, "school_only"))}</p>
          )}
        </section>
      )}

      {activeTab === "prep" && (
        <section className="space-y-3" role="tabpanel" data-testid="meal-operations-panel-prep">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("nutrition_hub.operations.prep_title")}
          </p>
          {prepTasks.length > 0 ? (
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
          ) : (
            <p className="text-sm text-muted-foreground">{t("nutrition_hub.operations.prep_empty")}</p>
          )}
        </section>
      )}

      {activeTab === "household" && (
        <section className="space-y-3" role="tabpanel" data-testid="meal-operations-panel-household">
          {showHousehold ? (
            <HouseholdGroceryBoard />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("nutrition_hub.operations.household_multi_child")}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
