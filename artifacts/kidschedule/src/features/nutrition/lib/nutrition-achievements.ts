import type { AgeGroupId } from "@/lib/nutrition-data";
import type { MealMemoryEntry } from "@/features/nutrition/lib/nutrition-memory";
import type { StoredDaySnapshot } from "@/features/nutrition/lib/nutrition-score-storage";
import { isStreakQualifyingDay } from "@/features/nutrition/lib/nutrition-streak";
import { isSchoolAgeBand } from "@/features/nutrition/lib/tiffin-planner";
import {
  schoolLunchTermI18nKey,
  type NutritionCountryProfile,
} from "@workspace/nutrition-localization";

export type AchievementId =
  | "first_nourishing_week"
  | "seven_day_consistency"
  | "family_meal_champion"
  | "healthy_tiffin_week"
  | "grocery_planner";

export interface AchievementDefinition {
  id: AchievementId;
  titleKey: string;
  descriptionKey: string;
  emoji: string;
}

export function resolveAchievementI18nKeys(
  def: AchievementDefinition,
  countryProfile: NutritionCountryProfile,
): { titleKey: string; descriptionKey: string } {
  if (def.id === "healthy_tiffin_week") {
    return {
      titleKey: schoolLunchTermI18nKey(countryProfile.schoolLunchTerm, "achievement_title"),
      descriptionKey: schoolLunchTermI18nKey(countryProfile.schoolLunchTerm, "achievement_desc"),
    };
  }
  return { titleKey: def.titleKey, descriptionKey: def.descriptionKey };
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: "first_nourishing_week",
    titleKey: "nutrition_hub.achievements.first_nourishing_week",
    descriptionKey: "nutrition_hub.achievements.first_nourishing_week_desc",
    emoji: "🌟",
  },
  {
    id: "seven_day_consistency",
    titleKey: "nutrition_hub.achievements.seven_day_consistency",
    descriptionKey: "nutrition_hub.achievements.seven_day_consistency_desc",
    emoji: "🔥",
  },
  {
    id: "family_meal_champion",
    titleKey: "nutrition_hub.achievements.family_meal_champion",
    descriptionKey: "nutrition_hub.achievements.family_meal_champion_desc",
    emoji: "👨‍👩‍👧",
  },
  {
    id: "healthy_tiffin_week",
    titleKey: "nutrition_hub.achievements.healthy_tiffin_week",
    descriptionKey: "nutrition_hub.achievements.healthy_tiffin_week_desc",
    emoji: "🎒",
  },
  {
    id: "grocery_planner",
    titleKey: "nutrition_hub.achievements.grocery_planner",
    descriptionKey: "nutrition_hub.achievements.grocery_planner_desc",
    emoji: "🛒",
  },
];

export interface AchievementState {
  id: AchievementId;
  unlocked: boolean;
  progress: number;
  progressLabel: string;
  newlyUnlocked: boolean;
}

export interface AchievementEvaluationInput {
  streak: number;
  history: Record<string, StoredDaySnapshot>;
  memoryEntries: MealMemoryEntry[];
  childrenCount: number;
  householdMemoryEntries: number;
  hasShoppingActivity: boolean;
  ageGroupId: AgeGroupId;
  todayKey: string;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDays(key: string, delta: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + delta);
  return formatDateKey(d);
}

function isQualifyingSnapshot(snap: StoredDaySnapshot): boolean {
  const minDayMet = snap.minDayMet ?? snap.checked >= 1;
  return isStreakQualifyingDay(snap.score, minDayMet);
}

export function hasNourishingWeek(history: Record<string, StoredDaySnapshot>): boolean {
  const keys = Object.keys(history).sort();
  if (keys.length === 0) return false;

  for (const startKey of keys) {
    let qualifying = 0;
    for (let i = 0; i < 7; i++) {
      const key = shiftDays(startKey, i);
      const snap = history[key];
      if (snap && isQualifyingSnapshot(snap)) qualifying++;
    }
    if (qualifying >= 5) return true;
  }
  return false;
}

export function nourishingWeekProgress(
  history: Record<string, StoredDaySnapshot>,
  todayKey: string,
): { progress: number; label: string } {
  let best = 0;
  for (let i = 0; i < 7; i++) {
    const key = shiftDays(todayKey, -i);
    const snap = history[key];
    if (snap && isQualifyingSnapshot(snap)) best++;
  }
  return {
    progress: Math.round((Math.min(best, 5) / 5) * 100),
    label: `${Math.min(best, 5)}/5 nourishing days this week`,
  };
}

export function countLovedLunchesThisWeek(
  entries: MealMemoryEntry[],
  todayKey: string,
): number {
  const weekStart = shiftDays(todayKey, -6);
  return entries.filter((e) => {
    if (e.mealSlot !== "lunch" || e.outcome !== "loved") return false;
    return e.dateKey >= weekStart && e.dateKey <= todayKey;
  }).length;
}

export function evaluateAchievements(
  input: AchievementEvaluationInput,
  previouslySeen: Set<AchievementId>,
): AchievementState[] {
  const {
    streak,
    history,
    memoryEntries,
    childrenCount,
    householdMemoryEntries,
    hasShoppingActivity,
    ageGroupId,
    todayKey,
  } = input;

  const nourishingUnlocked = hasNourishingWeek(history);
  const nourishingProg = nourishingWeekProgress(history, todayKey);

  const streakUnlocked = streak >= 7;
  const streakProg = Math.min(100, Math.round((Math.min(streak, 7) / 7) * 100));

  const familyUnlocked = childrenCount >= 2 && householdMemoryEntries >= 5;
  const familyProg = Math.min(
    100,
    childrenCount >= 2
      ? Math.round((Math.min(householdMemoryEntries, 5) / 5) * 100)
      : Math.round((childrenCount / 2) * 50),
  );

  const tiffinLoved = countLovedLunchesThisWeek(memoryEntries, todayKey);
  const tiffinUnlocked =
    isSchoolAgeBand(ageGroupId) && tiffinLoved >= 3;
  const tiffinProg = isSchoolAgeBand(ageGroupId)
    ? Math.round((Math.min(tiffinLoved, 3) / 3) * 100)
    : 0;

  const groceryUnlocked = hasShoppingActivity;
  const groceryProg = hasShoppingActivity ? 100 : 0;

  const states: Omit<AchievementState, "newlyUnlocked">[] = [
    {
      id: "first_nourishing_week",
      unlocked: nourishingUnlocked,
      progress: nourishingUnlocked ? 100 : nourishingProg.progress,
      progressLabel: nourishingUnlocked ? "Complete" : nourishingProg.label,
    },
    {
      id: "seven_day_consistency",
      unlocked: streakUnlocked,
      progress: streakUnlocked ? 100 : streakProg,
      progressLabel: streakUnlocked ? "Complete" : `${Math.min(streak, 7)}/7 days`,
    },
    {
      id: "family_meal_champion",
      unlocked: familyUnlocked,
      progress: familyUnlocked ? 100 : familyProg,
      progressLabel: familyUnlocked
        ? "Complete"
        : `${householdMemoryEntries}/5 family meal logs`,
    },
    {
      id: "healthy_tiffin_week",
      unlocked: tiffinUnlocked,
      progress: tiffinUnlocked ? 100 : tiffinProg,
      progressLabel: tiffinUnlocked
        ? "Complete"
        : `${tiffinLoved}/3 loved lunches this week`,
    },
    {
      id: "grocery_planner",
      unlocked: groceryUnlocked,
      progress: groceryProg,
      progressLabel: groceryUnlocked ? "Complete" : "Use shopping mode once",
    },
  ];

  return states.map((s) => ({
    ...s,
    newlyUnlocked: s.unlocked && !previouslySeen.has(s.id),
  }));
}

export function pickNextMilestone(states: AchievementState[]): AchievementState | null {
  const locked = states.filter((s) => !s.unlocked);
  if (locked.length === 0) return null;
  return locked.sort((a, b) => b.progress - a.progress)[0] ?? null;
}

export function newlyUnlockedAchievements(states: AchievementState[]): AchievementState[] {
  return states.filter((s) => s.newlyUnlocked);
}

const SEEN_STORAGE_PREFIX = "nutrition:achievements-seen:";

export function loadSeenAchievements(childId: number): Set<AchievementId> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(`${SEEN_STORAGE_PREFIX}${childId}`);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as AchievementId[]);
  } catch {
    return new Set();
  }
}

export function markAchievementsSeen(childId: number, ids: AchievementId[]): void {
  if (typeof localStorage === "undefined" || ids.length === 0) return;
  const existing = loadSeenAchievements(childId);
  for (const id of ids) existing.add(id);
  try {
    localStorage.setItem(`${SEEN_STORAGE_PREFIX}${childId}`, JSON.stringify([...existing]));
  } catch {
    /* quota */
  }
}
