import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useListChildren } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";
import { NUTRITION_HUB_ACCENT, hubSectionCardClasses } from "@/lib/parent-hub-premium";
import { monthsToAgeGroupId } from "@/features/nutrition/lib/age-band-map";
import {
  buildChildNutritionSnapshot,
  shouldShowHouseholdBoard,
} from "@/features/nutrition/lib/household-aggregation";
import { loadMealMemoryEntries } from "@/features/nutrition/lib/nutrition-memory-sync";
import { dateKeyLocal } from "@/features/nutrition/lib/nutrition-score-storage";

function childAgeMonths(c: { age: number; ageMonths?: number | null }): number {
  return c.age * 12 + (c.ageMonths ?? 0);
}

export function HouseholdNutritionBoard() {
  const { t } = useTranslation();
  const { data: children = [] } = useListChildren();
  const { isPremium } = useSubscription();
  const { openPaywall } = usePaywall();
  const todayKey = dateKeyLocal();
  const locked = !isPremium;
  const showBoard = shouldShowHouseholdBoard(children.length);

  const rows = useMemo(() => {
    if (!showBoard || locked) return [];
    return children.map((c) =>
      buildChildNutritionSnapshot({
        childId: c.id,
        name: c.name,
        ageGroupId: monthsToAgeGroupId(childAgeMonths(c)),
        todayKey,
        memoryEntries: loadMealMemoryEntries(c.id),
      }),
    );
  }, [children, todayKey, locked, showBoard]);

  if (!showBoard) return null;

  return (
    <div className={cn(hubSectionCardClasses(NUTRITION_HUB_ACCENT), "overflow-hidden relative")}>
      {locked && (
        <button
          type="button"
          className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => openPaywall("hub_nutrition")}
        >
          <span className="text-sm font-medium text-foreground">
            {t("nutrition_hub.household.premium_board")}
          </span>
        </button>
      )}
      <div className={cn("p-4 sm:p-5 space-y-3", locked && "blur-[2px] select-none pointer-events-none")}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("nutrition_hub.household.board_title")}
        </p>
        {!locked && (
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.childId}
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs"
              >
                <div className="min-w-0 col-span-2 sm:col-span-1">
                  <p className="font-semibold text-foreground truncate">{row.name}</p>
                  <p className="text-muted-foreground capitalize">{row.confidenceLevel}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("nutrition_hub.household.nci")}</p>
                  <p className="font-semibold text-foreground">{row.confidenceScore}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("nutrition_hub.household.focus")}</p>
                  <p className="font-semibold text-foreground truncate">{row.focusNutrient}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("nutrition_hub.household.acceptance")}</p>
                  <p className="font-semibold text-foreground">{row.acceptanceRate}%</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
