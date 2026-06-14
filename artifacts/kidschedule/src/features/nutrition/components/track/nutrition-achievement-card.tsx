import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useListChildren } from "@workspace/api-client-react";
import { Trophy } from "lucide-react";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { useMealMemory } from "@/features/nutrition/hooks/use-meal-memory";
import { useNutritionTrackMeta } from "@/features/nutrition/hooks/use-nutrition-track-meta";
import { nutritionFadeUp, NUTRITION_TRANSITION } from "@/features/nutrition/lib/nutrition-motion";
import {
  ACHIEVEMENT_DEFINITIONS,
  evaluateAchievements,
  loadSeenAchievements,
  markAchievementsSeen,
  newlyUnlockedAchievements,
  pickNextMilestone,
} from "@/features/nutrition/lib/nutrition-achievements";
import {
  dateKeyLocal,
  getStoreHistory,
} from "@/features/nutrition/lib/nutrition-score-storage";
import { loadMealMemoryEntries } from "@/features/nutrition/lib/nutrition-memory-sync";
import { hasAnyShoppingActivity } from "@/features/nutrition/lib/shopping-storage";
import {
  trackAchievementUnlocked,
  trackAchievementViewed,
} from "@/features/nutrition/lib/nutrition-hub-analytics";

export function NutritionAchievementCard() {
  const { t } = useTranslation();
  const { childId, ageGroupId } = useNutritionContext();
  const { entries } = useMealMemory();
  const { streak } = useNutritionTrackMeta();
  const { data: children = [] } = useListChildren();
  const todayKey = dateKeyLocal();
  const [seenVersion, setSeenVersion] = useState(0);
  const viewedRef = useRef(false);

  const states = useMemo(() => {
    if (!childId) return [];
    const history = getStoreHistory(childId);
    const householdMemory = children.reduce(
      (n, c) => n + loadMealMemoryEntries(c.id).length,
      0,
    );
    const seen = loadSeenAchievements(childId);
    return evaluateAchievements(
      {
        streak,
        history,
        memoryEntries: entries,
        childrenCount: children.length,
        householdMemoryEntries: householdMemory,
        hasShoppingActivity: hasAnyShoppingActivity(`child-${childId}`),
        ageGroupId,
        todayKey,
      },
      seen,
    );
  }, [childId, streak, entries, children, ageGroupId, todayKey, seenVersion]);

  const unlocked = newlyUnlockedAchievements(states);
  const next = pickNextMilestone(states);

  useEffect(() => {
    if (!childId || viewedRef.current) return;
    viewedRef.current = true;
    trackAchievementViewed(childId, next?.id ?? states[0]?.id ?? "first_nourishing_week");
  }, [childId, next?.id, states]);

  useEffect(() => {
    if (!childId || unlocked.length === 0) return;
    for (const u of unlocked) {
      trackAchievementUnlocked(childId, u.id);
    }
    markAchievementsSeen(
      childId,
      unlocked.map((u) => u.id),
    );
    setSeenVersion((v) => v + 1);
  }, [childId, unlocked]);

  if (!childId || states.length === 0) return null;
  if (unlocked.length === 0 && !next) return null;

  const defFor = (id: string) => ACHIEVEMENT_DEFINITIONS.find((d) => d.id === id);

  return (
    <motion.div
      className="rounded-xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[0.06] to-emerald-500/[0.04] p-4 space-y-3"
      variants={nutritionFadeUp}
      initial="initial"
      animate="animate"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/70 flex items-center gap-1.5">
        <Trophy className="h-3.5 w-3.5" />
        {t("nutrition_hub.achievements.title")}
      </p>

      {unlocked.map((u) => {
        const def = defFor(u.id);
        if (!def) return null;
        return (
          <motion.div
            key={u.id}
            className="rounded-lg border border-amber-400/35 bg-gradient-to-r from-amber-500/15 to-emerald-500/10 px-3 py-2.5 nutrition-achievement-unlock"
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={NUTRITION_TRANSITION.unlock}
          >
            <p className="text-sm font-semibold text-foreground">
              {def.emoji} {t(def.titleKey)} — {t("nutrition_hub.achievements.unlocked")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t(def.descriptionKey)}</p>
          </motion.div>
        );
      })}

      {next && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            {t("nutrition_hub.achievements.next_milestone")}
          </p>
          {(() => {
            const def = defFor(next.id);
            if (!def) return null;
            return (
              <>
                <p className="text-xs text-muted-foreground">
                  {def.emoji} {t(def.titleKey)}
                </p>
                <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${next.progress}%` }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{next.progressLabel}</p>
              </>
            );
          })()}
        </div>
      )}
    </motion.div>
  );
}
