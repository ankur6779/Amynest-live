import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { dateKeyLocal } from "@/features/nutrition/lib/nutrition-score-storage";
import { persistMealOutcome } from "@/features/nutrition/lib/nutrition-memory-sync";
import type { MealOutcome } from "@/features/nutrition/lib/nutrition-memory.types";

export function MealFeedbackButtons({
  mealName,
  mealSlot,
  compact = false,
}: {
  mealName: string;
  mealSlot: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const { childId } = useNutritionContext();
  const authFetch = useAuthFetch();

  if (!childId || !mealName.trim()) return null;

  const options: Array<{ outcome: MealOutcome; label: string; emoji: string }> = [
    { outcome: "loved", label: t("nutrition_hub.household.feedback_loved"), emoji: "😋" },
    { outcome: "some", label: t("nutrition_hub.household.feedback_some"), emoji: "🙂" },
    { outcome: "skipped", label: t("nutrition_hub.household.feedback_skipped"), emoji: "↩️" },
  ];

  const handle = (outcome: MealOutcome) => {
    void persistMealOutcome(
      childId,
      { dateKey: dateKeyLocal(), mealSlot, mealName, outcome },
      authFetch,
    );
  };

  return (
    <div className={cn("space-y-1.5", compact ? "mt-2" : "mt-3")}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {t("nutrition_hub.household.feedback_prompt")}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.outcome}
            type="button"
            onClick={() => handle(o.outcome)}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-white/[0.08] transition"
          >
            <span>{o.emoji}</span>
            <span>{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
