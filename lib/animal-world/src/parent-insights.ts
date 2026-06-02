import type {
  Animal,
  AnimalCategory,
  AnimalWorldProgressV2,
  AnimalWorldSessionStats,
  ParentInsightsSnapshot,
} from "./types.js";
import { hearFindAccuracyPct } from "./hear-find-engine.js";
import { getAnimalMastery } from "./collection.js";

export type ParentInsightsInput = {
  stats: AnimalWorldSessionStats;
  progress: AnimalWorldProgressV2;
  animals: Animal[];
};

function weekKey(date = new Date()): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return d.toISOString().slice(0, 10);
}

function monthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export function buildParentInsights(input: ParentInsightsInput): ParentInsightsSnapshot {
  const { stats, progress, animals } = input;

  const mostPlayed = Object.entries(stats.playCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([animalId, count]) => ({ animalId, count }));

  const mostRecognized = animals
    .map((animal) => {
      const m = getAnimalMastery(progress, animal.id);
      const attempts = m.hearFindAttempts + m.quizzesCorrect;
      const correct = m.hearFindCorrect + m.quizzesCorrect;
      const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
      return { animalId: animal.id, accuracy };
    })
    .filter((row) => row.accuracy > 0)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 8);

  const quizAttempts = progress.quizCorrectTotal;
  const quizAccuracyPct =
    quizAttempts > 0
      ? Math.min(100, Math.round((progress.quizCorrectTotal / Math.max(quizAttempts, 1)) * 100))
      : 0;

  const hearFindAccuracy = hearFindAccuracyPct(
    progress.hearFindCorrectTotal,
    progress.hearFindAttemptTotal,
  );

  const categoryCounts = new Map<AnimalCategory, number>();
  for (const [animalId, count] of Object.entries(stats.playCounts)) {
    const animal = animals.find((a) => a.id === animalId);
    if (!animal) continue;
    categoryCounts.set(animal.category, (categoryCounts.get(animal.category) ?? 0) + count);
  }
  const favoriteCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));

  const currentWeek = weekKey();
  const weeklyProgress = Object.entries(progress.weeklyMinutes)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([weekKey, minutes]) => ({ weekKey, minutes }));

  if (!weeklyProgress.some((w) => w.weekKey === currentWeek)) {
    weeklyProgress.push({
      weekKey: currentWeek,
      minutes: Math.round(stats.totalSessionMs / 60000),
    });
  }

  const currentMonth = monthKey();
  const monthlyProgress = Object.entries(progress.monthlyAnimalsOpened)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([monthKey, animalsOpened]) => ({ monthKey, animalsOpened }));

  if (!monthlyProgress.some((m) => m.monthKey === currentMonth)) {
    monthlyProgress.push({
      monthKey: currentMonth,
      animalsOpened: Object.keys(stats.playCounts).length,
    });
  }

  return {
    mostPlayed,
    mostRecognized,
    quizAccuracyPct,
    hearFindAccuracyPct: hearFindAccuracy,
    favoriteCategories,
    weeklyProgress,
    monthlyProgress,
    streakDays: stats.streakDays,
  };
}
