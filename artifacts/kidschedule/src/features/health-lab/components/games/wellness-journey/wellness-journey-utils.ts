import { filterHistoryByRange } from "../../../storage";
import { avgMetric, previousPeriodHistory } from "../../../dashboard-utils";
import type { GameSessionResult, HealthGameId, HealthLabPersistedState } from "../../../types";

export function getBreathingScore(history: GameSessionResult[]): number {
  const breath = history.filter((s) => s.gameId === "breath-control");
  if (breath.length === 0) return 0;
  return Math.round(breath.reduce((a, s) => a + s.score, 0) / breath.length);
}

export function buildAdventureStory(state: HealthLabPersistedState): string {
  const week = filterHistoryByRange(state.gameHistory, "7d");
  if (week.length === 0) {
    return "Your wellness adventure is just beginning! Play a challenge and Amy will write your story.";
  }

  const counts: Partial<Record<HealthGameId, number>> = {};
  for (const s of week) counts[s.gameId] = (counts[s.gameId] ?? 0) + 1;

  const parts: string[] = [];
  if (counts["freeze-statue"]) parts.push(`restored ${counts["freeze-statue"]} crystal garden${counts["freeze-statue"] > 1 ? "s" : ""}`);
  if (counts["reaction-time"]) parts.push(`launched ${counts["reaction-time"]} rocket${counts["reaction-time"] > 1 ? "s" : ""}`);
  if (counts["flamingo-balance"]) parts.push(`protected ${counts["flamingo-balance"]} floating island${counts["flamingo-balance"] > 1 ? "s" : ""}`);
  if (counts["breath-control"]) parts.push(`soared on ${counts["breath-control"]} balloon journey${counts["breath-control"] > 1 ? "s" : ""}`);
  if (counts["finger-stability"]) parts.push(`powered the reactor ${counts["finger-stability"]} time${counts["finger-stability"] > 1 ? "s" : ""}`);

  if (parts.length === 0) {
    return `This week you completed ${week.length} wellness adventure${week.length > 1 ? "s" : ""}. Amy is proud of your progress!`;
  }

  return `This week you ${parts.join(", ")}. Amy is proud of your progress!`;
}

export function getAmyInsights(state: HealthLabPersistedState): string[] {
  const week = filterHistoryByRange(state.gameHistory, "7d");
  const prev = previousPeriodHistory(state.gameHistory, "7d");
  const insights: string[] = [];

  const focusNow = avgMetric(week, "focus");
  const focusPrev = avgMetric(prev, "focus");
  if (focusNow > 0 && focusPrev > 0) {
    const delta = Math.round(((focusNow - focusPrev) / focusPrev) * 100);
    if (delta >= 10) insights.push("Your focus skills are growing quickly.");
    else if (delta <= -10) insights.push("Try one more focus challenge today — you've got this!");
  } else if (focusNow > 0) {
    insights.push("Your focus skills are off to a great start!");
  }

  const balanceNow = avgMetric(week, "balance");
  if (balanceNow >= 75) insights.push("Balance is one of your superpowers this week.");
  else if (balanceNow > 0 && balanceNow < 60) insights.push("Try one more balance challenge today.");

  const unplayed = (["breath-control", "flamingo-balance", "reaction-time", "freeze-statue", "finger-stability"] as const).filter(
    (g) => !state.gamesCompletedToday.includes(g),
  );
  if (unplayed.length > 0 && state.gamesCompletedToday.length > 0) {
    insights.push(`Explore ${unplayed.length} more challenge${unplayed.length > 1 ? "s" : ""} to grow your wellness world.`);
  }

  if (insights.length === 0) {
    insights.push("Every adventure makes your wellness world grow. Keep exploring!");
  }

  return insights.slice(0, 3);
}

export interface WeeklyHighlight {
  emoji: string;
  label: string;
  value: string;
}

export function getWeeklyHighlights(state: HealthLabPersistedState): WeeklyHighlight[] {
  const week = filterHistoryByRange(state.gameHistory, "7d");
  const highlights: WeeklyHighlight[] = [];

  const balloon = week.filter((s) => s.gameId === "breath-control");
  if (balloon.length > 0) {
    const best = Math.max(...balloon.map((s) => s.score));
    highlights.push({ emoji: "🎈", label: "Best Balloon Journey", value: `${best} pts` });
  }

  const rocket = week.filter((s) => s.gameId === "reaction-time");
  if (rocket.length > 0) {
    const best = Math.max(...rocket.map((s) => s.score));
    highlights.push({ emoji: "⚡", label: "Fastest Rocket Launch", value: `${best} pts` });
  }

  const garden = week.filter((s) => s.gameId === "freeze-statue");
  if (garden.length > 0) {
    const best = Math.max(...garden.map((s) => s.score));
    highlights.push({ emoji: "🌸", label: "Best Crystal Garden", value: `${best} pts` });
  }

  const island = week.filter((s) => s.gameId === "flamingo-balance");
  if (island.length > 0) {
    const best = Math.max(...island.map((s) => s.score));
    highlights.push({ emoji: "🦩", label: "Longest Balance", value: `${best} pts` });
  }

  return highlights.slice(0, 4);
}

export interface HallOfFameEntry {
  emoji: string;
  label: string;
  value: string;
}

export function getHallOfFame(state: HealthLabPersistedState, overallScore: number): HallOfFameEntry[] {
  const entries: HallOfFameEntry[] = [
    { emoji: "🌟", label: "Highest Wellness Score", value: overallScore > 0 ? String(overallScore) : "—" },
  ];

  const gameLabels: Partial<Record<HealthGameId, { emoji: string; label: string }>> = {
    "flamingo-balance": { emoji: "🦩", label: "Longest Balance" },
    "reaction-time": { emoji: "⚡", label: "Fastest Reaction" },
    "breath-control": { emoji: "🎈", label: "Longest Balloon Journey" },
    "finger-stability": { emoji: "💎", label: "Best Focus Session" },
    "freeze-statue": { emoji: "🌸", label: "Best Crystal Garden" },
  };

  for (const [gameId, meta] of Object.entries(gameLabels) as [HealthGameId, { emoji: string; label: string }][]) {
    const pb = state.personalBests[gameId];
    if (pb != null && meta) {
      entries.push({ emoji: meta.emoji, label: meta.label, value: String(pb) });
    }
  }

  return entries.slice(0, 5);
}

export function getLevelProgress(state: HealthLabPersistedState, getLevelForXp: (xp: number, prestige?: number) => { xpRequired: number; id: number }, getNextLevel: (id: number) => { xpRequired: number } | null) {
  const level = getLevelForXp(state.totalXp, state.prestige);
  const next = getNextLevel(level.id);
  if (!next) return { level: level.id, pct: 100 };
  const range = next.xpRequired - level.xpRequired;
  const progress = state.totalXp - level.xpRequired;
  return { level: level.id, pct: Math.min(100, Math.round((progress / range) * 100)) };
}
