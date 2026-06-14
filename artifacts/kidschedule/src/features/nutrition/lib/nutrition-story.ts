import type { WeeklyTrendDay } from "@/features/nutrition/lib/nutrition-streak";
import { nutrientDisplayName } from "@/features/nutrition/lib/focus-nutrient-engine";

export interface WeeklyStoryInput {
  weeklyTrend: WeeklyTrendDay[];
  streak: number;
  focusNutrientId: string;
  checklistHits: Record<string, number>;
  daysLogged: number;
}

export interface WeeklyNutritionStory {
  wins: [string, string, string];
  focusArea: string;
  focusLabel: string;
}

function trendImproved(days: WeeklyTrendDay[]): boolean {
  const active = days.filter((d) => d.checked > 0);
  if (active.length < 2) return false;
  const mid = Math.floor(active.length / 2);
  const early = active.slice(0, mid);
  const late = active.slice(mid);
  const avgEarly = early.reduce((s, d) => s + d.score, 0) / early.length;
  const avgLate = late.reduce((s, d) => s + d.score, 0) / late.length;
  return avgLate - avgEarly >= 5;
}

function proteinDays(hits: Record<string, number>): number {
  return hits.protein ?? 0;
}

function familyConsistencyDays(days: WeeklyTrendDay[]): number {
  return days.filter((d) => d.minDayMet || d.checked >= 3).length;
}

export function generateWeeklyNutritionStory(input: WeeklyStoryInput): WeeklyNutritionStory {
  const { weeklyTrend, streak, focusNutrientId, checklistHits, daysLogged } = input;
  const focusLabel = nutrientDisplayName(focusNutrientId);

  const winCandidates: string[] = [];

  const proteinCount = proteinDays(checklistHits);
  if (proteinCount >= 3) {
    winCandidates.push(`Protein-rich meals appeared ${proteinCount} days`);
  } else if (checklistHits.dairy && checklistHits.dairy >= 2) {
    winCandidates.push(`Calcium sources logged ${checklistHits.dairy} days`);
  }

  if (trendImproved(weeklyTrend)) {
    winCandidates.push("Nutrition score improved across the week");
  } else if (daysLogged >= 4) {
    winCandidates.push("Great consistency over the last 7 days");
  }

  const familyDays = familyConsistencyDays(weeklyTrend);
  if (familyDays >= 4) {
    winCandidates.push("Family meal consistency increased");
  } else if (streak >= 2) {
    winCandidates.push(`${streak}-day nourishment streak`);
  }

  if (checklistHits.greens && checklistHits.greens >= 2) {
    winCandidates.push("Green vegetables showed up multiple times");
  }
  if (checklistHits.fruit && checklistHits.fruit >= 3) {
    winCandidates.push("Fruit was part of most logged days");
  }

  const defaults: string[] = [
    "You showed up for daily check-ins",
    "Small steps build lasting habits",
    "Age-appropriate meals stay on your radar",
  ];

  const wins: string[] = [];
  for (const w of winCandidates) {
    if (wins.length >= 3) break;
    if (!wins.includes(w)) wins.push(w);
  }
  for (const d of defaults) {
    if (wins.length >= 3) break;
    if (!wins.includes(d)) wins.push(d);
  }

  while (wins.length < 3) wins.push(defaults[wins.length] ?? defaults[0]!);

  return {
    wins: [wins[0]!, wins[1]!, wins[2]!],
    focusArea: focusNutrientId,
    focusLabel,
  };
}

export interface InsightCandidate {
  id: string;
  message: string;
  priority: number;
}

export function buildInsightCandidates(input: WeeklyStoryInput & { confidenceLevel: string }): InsightCandidate[] {
  const candidates: InsightCandidate[] = [];
  const { weeklyTrend, streak, checklistHits, daysLogged } = input;

  if (proteinDays(checklistHits) >= 4) {
    candidates.push({
      id: "protein_consistent",
      message: "Protein appeared consistently this week.",
      priority: 80,
    });
  }

  if (familyConsistencyDays(weeklyTrend) >= 4) {
    candidates.push({
      id: "family_meals",
      message: "Family meals improved this week.",
      priority: 75,
    });
  }

  if (daysLogged >= 5) {
    candidates.push({
      id: "consistency",
      message: "Great consistency over the last 7 days.",
      priority: 70,
    });
  }

  if (streak >= 3) {
    candidates.push({
      id: "streak",
      message: `${streak} days in a row of nourishment check-ins.`,
      priority: 65,
    });
  }

  if (trendImproved(weeklyTrend)) {
    candidates.push({
      id: "score_up",
      message: "Your weekly nutrition score is trending up.",
      priority: 60,
    });
  }

  if (input.confidenceLevel === "building" && daysLogged >= 1) {
    candidates.push({
      id: "building",
      message: "Building confidence — one check-in at a time.",
      priority: 40,
    });
  }

  return candidates.sort((a, b) => b.priority - a.priority);
}

export function selectOneInsight(candidates: InsightCandidate[]): string | null {
  if (candidates.length === 0) return null;
  return candidates[0]!.message;
}
