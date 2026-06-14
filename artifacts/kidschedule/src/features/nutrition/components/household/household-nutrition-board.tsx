import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { useListChildren } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";
import {
  NUTRITION_CHILD_PROFILE_CARD,
  NUTRITION_HOUSEHOLD_CARD,
  childAvatarGradient,
} from "@/features/nutrition/lib/nutrition-ui-tokens";
import { nutritionFadeUp } from "@/features/nutrition/lib/nutrition-motion";
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

function confidenceTone(level: string): string {
  if (level === "strong") return "text-emerald-300 bg-emerald-500/15 border-emerald-400/25";
  if (level === "building") return "text-amber-200 bg-amber-500/12 border-amber-400/25";
  return "text-muted-foreground bg-white/[0.06] border-white/10";
}

function ChildProfileCard({
  childId,
  name,
  confidenceLevel,
  confidenceScore,
  focusNutrient,
  acceptanceRate,
}: {
  childId: number;
  name: string;
  confidenceLevel: string;
  confidenceScore: number;
  focusNutrient: string;
  acceptanceRate: number;
}) {
  const { t } = useTranslation();
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const avatarGradient = childAvatarGradient(childId);

  return (
    <motion.div
      className={NUTRITION_CHILD_PROFILE_CARD}
      variants={nutritionFadeUp}
      initial="initial"
      animate="animate"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
            "bg-gradient-to-br text-sm font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)]",
            avatarGradient,
          )}
          aria-hidden
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">{name}</p>
          <span
            className={cn(
              "inline-flex mt-0.5 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
              confidenceTone(confidenceLevel),
            )}
          >
            {confidenceLevel}
          </span>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {t("nutrition_hub.household.nci")}
          </p>
          <p className="font-bold text-lg tabular-nums text-foreground">{confidenceScore}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {t("nutrition_hub.household.focus")}
          </p>
          <p className="text-sm font-semibold text-foreground truncate mt-0.5">{focusNutrient}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {t("nutrition_hub.household.acceptance")}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
                initial={{ width: 0 }}
                animate={{ width: `${acceptanceRate}%` }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums text-foreground shrink-0">
              {acceptanceRate}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
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
    <motion.div
      className={cn(NUTRITION_HOUSEHOLD_CARD, "overflow-hidden relative")}
      variants={nutritionFadeUp}
      initial="initial"
      animate="animate"
    >
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
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-500/15 border border-teal-400/25">
            <Users className="h-3.5 w-3.5 text-teal-300/90" aria-hidden />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-200/70">
            {t("nutrition_hub.household.board_title")}
          </p>
        </div>
        {!locked && (
          <div className="space-y-2.5">
            {rows.map((row) => (
              <ChildProfileCard
                key={row.childId}
                childId={row.childId}
                name={row.name}
                confidenceLevel={row.confidenceLevel}
                confidenceScore={row.confidenceScore}
                focusNutrient={row.focusNutrient}
                acceptanceRate={row.acceptanceRate}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
