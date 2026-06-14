import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { dateKeyLocal } from "@/features/nutrition/lib/nutrition-score-storage";
import { persistMealOutcome } from "@/features/nutrition/lib/nutrition-memory-sync";
import { nutritionTapFeedback } from "@/features/nutrition/lib/nutrition-motion";
import type { MealOutcome } from "@/features/nutrition/lib/nutrition-memory.types";

const OUTCOME_STYLES: Record<MealOutcome, { active: string; idle: string }> = {
  loved: {
    active: "border-emerald-400/50 bg-emerald-500/20 shadow-[0_0_16px_rgba(52,211,153,0.25)]",
    idle: "hover:border-emerald-400/30 hover:bg-emerald-500/10",
  },
  some: {
    active: "border-amber-400/50 bg-amber-500/15 shadow-[0_0_16px_rgba(251,191,36,0.20)]",
    idle: "hover:border-amber-400/30 hover:bg-amber-500/10",
  },
  skipped: {
    active: "border-white/25 bg-white/[0.08]",
    idle: "hover:border-white/20 hover:bg-white/[0.06]",
  },
};

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
  const [selected, setSelected] = useState<MealOutcome | null>(null);

  if (!childId || !mealName.trim()) return null;

  const options: Array<{ outcome: MealOutcome; label: string; emoji: string }> = [
    { outcome: "loved", label: t("nutrition_hub.household.feedback_loved"), emoji: "😋" },
    { outcome: "some", label: t("nutrition_hub.household.feedback_some"), emoji: "🙂" },
    { outcome: "skipped", label: t("nutrition_hub.household.feedback_skipped"), emoji: "↩️" },
  ];

  const handle = (outcome: MealOutcome) => {
    setSelected(outcome);
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
        {options.map((o) => {
          const isActive = selected === o.outcome;
          const styles = OUTCOME_STYLES[o.outcome];
          return (
            <motion.button
              key={o.outcome}
              type="button"
              onClick={() => handle(o.outcome)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5",
                "text-[11px] font-medium text-foreground transition-colors duration-150",
                "border-white/10 bg-white/[0.04]",
                isActive ? styles.active : styles.idle,
              )}
              {...nutritionTapFeedback}
              animate={isActive ? { scale: [1, 1.06, 1] } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <span>{o.emoji}</span>
              <span>{o.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
