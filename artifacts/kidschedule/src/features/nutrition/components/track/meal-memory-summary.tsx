import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";
import { useMealMemory } from "@/features/nutrition/hooks/use-meal-memory";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { buildMealMemorySummary } from "@/features/nutrition/lib/nutrition-memory";
import { cn } from "@/lib/utils";

export function MealMemorySummaryCard() {
  const { t } = useTranslation();
  const { activeChild } = useNutritionContext();
  const { entries } = useMealMemory();
  const { isPremium } = useSubscription();
  const { openPaywall } = usePaywall();

  const lines = buildMealMemorySummary(entries, activeChild.name ?? "Your child");

  if (lines.length === 0) return null;

  return (
    <div className="relative rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-2">
      {!isPremium && (
        <button
          type="button"
          className="absolute inset-0 z-10 rounded-xl bg-background/50 backdrop-blur-[1px]"
          onClick={() => openPaywall("hub_nutrition")}
          aria-label={t("nutrition_hub.household.memory_premium")}
        />
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("nutrition_hub.household.memory_title")}
      </p>
      <ul className={cn("space-y-1", !isPremium && "blur-[2px] select-none")}>
        {lines.map((line) => (
          <li key={line.text} className="text-sm text-foreground">
            {line.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
