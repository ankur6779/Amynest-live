import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useListChildren } from "@workspace/api-client-react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import { useMealMemory } from "@/features/nutrition/hooks/use-meal-memory";
import { useNutritionTrackMeta } from "@/features/nutrition/hooks/use-nutrition-track-meta";
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
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <Trophy className="h-3.5 w-3.5" />
        {t("nutrition_hub.achievements.title")}
      </p>

      {unlocked.map((u) => {
        const def = defFor(u.id);
        if (!def) return null;
        return (
          <div
            key={u.id}
            className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5"
          >
            <p className="text-sm font-semibold text-foreground">
              {def.emoji} {t(def.titleKey)} — {t("nutrition_hub.achievements.unlocked")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t(def.descriptionKey)}</p>
          </div>
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
                  <div
                    className={cn("h-full rounded-full bg-primary transition-all")}
                    style={{ width: `${next.progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{next.progressLabel}</p>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
