import type { BadgeId, GameSessionResult, HealthLabPersistedState } from "./types";

const FOCUS_GAMES = ["breath-control", "finger-stability", "reaction-time"] as const;
const BALANCE_GAMES = ["flamingo-balance", "freeze-statue"] as const;
const CALMNESS_GAMES = ["breath-control", "freeze-statue", "calmness-meter"] as const;

function avgMetricInSessions(
  history: GameSessionResult[],
  gameIds: readonly string[],
  metric: keyof GameSessionResult["metrics"],
  minSessions: number,
  minScore: number,
): boolean {
  const relevant = history.filter(
    (s) => gameIds.includes(s.gameId) && (s.metrics[metric] ?? s.score) >= minScore,
  );
  return relevant.length >= minSessions;
}

export function shouldUnlockFocusMaster(state: HealthLabPersistedState): boolean {
  return avgMetricInSessions(state.gameHistory, FOCUS_GAMES, "focus", 8, 80);
}

export function shouldUnlockBalanceMaster(state: HealthLabPersistedState): boolean {
  return avgMetricInSessions(state.gameHistory, BALANCE_GAMES, "balance", 8, 80);
}

export function shouldUnlockCalmnessMaster(state: HealthLabPersistedState): boolean {
  return avgMetricInSessions(state.gameHistory, CALMNESS_GAMES, "calmness", 8, 80);
}

export function evaluateMasterBadges(state: HealthLabPersistedState): BadgeId[] {
  const unlocks: BadgeId[] = [];
  if (shouldUnlockFocusMaster(state)) unlocks.push("focus-master");
  if (shouldUnlockBalanceMaster(state)) unlocks.push("balance-master");
  if (shouldUnlockCalmnessMaster(state)) unlocks.push("calmness-master");
  return unlocks;
}
