import type { WorldManifestItem } from "./manifest-types.js";
import type { WorldProgressV2 } from "./progress-types.js";
import { defaultWorldItemMastery } from "./progress-types.js";
import type { WorldId } from "./types.js";

export type PlatformParentInsights = {
  mostPlayed: Array<{ itemId: string; count: number }>;
  mostRecognized: Array<{ itemId: string; accuracy: number }>;
  quizAccuracyPct: number;
  hearFindAccuracyPct: number;
  favoriteCategories: Array<{ category: string; count: number }>;
  weeklyProgress: Array<{ weekKey: string; minutes: number }>;
  monthlyProgress: Array<{ monthKey: string; itemsOpened: number }>;
  streakDays: number;
  completedWorlds: WorldId[];
};

export function buildPlatformParentInsights(input: {
  progress: WorldProgressV2;
  items: WorldManifestItem[];
  playCounts: Record<string, number>;
  completedWorldIds?: WorldId[];
}): PlatformParentInsights {
  const { progress, items, playCounts, completedWorldIds = [] } = input;

  const mostPlayed = Object.entries(playCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([itemId, count]) => ({ itemId, count }));

  const mostRecognized = items
    .map((item) => {
      const m = progress.itemMastery[item.id] ?? defaultWorldItemMastery();
      const attempts = m.hearFindAttempts + m.quizzesCorrect;
      const correct = m.hearFindCorrect + m.quizzesCorrect;
      return {
        itemId: item.id,
        accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
      };
    })
    .filter((r) => r.accuracy > 0)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 8);

  const hearFindAccuracyPct =
    progress.hearFindAttemptTotal > 0
      ? Math.round((progress.hearFindCorrectTotal / progress.hearFindAttemptTotal) * 100)
      : 0;

  const quizAccuracyPct =
    progress.quizCorrectTotal > 0
      ? Math.min(100, Math.round((progress.quizCorrectTotal / Math.max(progress.quizCorrectTotal, 1)) * 100))
      : 0;

  const categoryCounts = new Map<string, number>();
  for (const [itemId, count] of Object.entries(playCounts)) {
    const item = items.find((i) => i.id === itemId);
    if (!item) continue;
    categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + count);
  }

  return {
    mostPlayed,
    mostRecognized,
    quizAccuracyPct,
    hearFindAccuracyPct,
    favoriteCategories: [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count })),
    weeklyProgress: Object.entries(progress.weeklyMinutes)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([weekKey, minutes]) => ({ weekKey, minutes })),
    monthlyProgress: Object.entries(progress.monthlyItemsOpened)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([monthKey, itemsOpened]) => ({ monthKey, itemsOpened })),
    streakDays: progress.streakDays,
    completedWorlds: completedWorldIds,
  };
}
