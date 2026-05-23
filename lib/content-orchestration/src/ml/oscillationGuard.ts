import type { NbaAction } from "./types.js";

const DIFFICULTY_UP: NbaAction[] = ["INCREASE_DIFFICULTY"];
const DIFFICULTY_DOWN: NbaAction[] = ["DECREASE_DIFFICULTY"];

function isDifficultyDirection(a: NbaAction): "up" | "down" | "other" {
  if (DIFFICULTY_UP.includes(a)) return "up";
  if (DIFFICULTY_DOWN.includes(a)) return "down";
  return "other";
}

export function countDirectionChanges(actions: NbaAction[]): number {
  let changes = 0;
  for (let i = 1; i < actions.length; i++) {
    const prev = isDifficultyDirection(actions[i - 1]!);
    const cur = isDifficultyDirection(actions[i]!);
    if (prev !== "other" && cur !== "other" && prev !== cur) changes++;
    if (actions[i - 1] !== actions[i]!) changes++;
  }
  return changes;
}

export function isActionOscillating(recentActions: NbaAction[]): boolean {
  if (recentActions.length < 3) return false;
  const last3 = recentActions.slice(-3);
  return countDirectionChanges(last3) >= 2;
}

/**
 * When oscillating, prefer stability over aggressive ML changes.
 */
export function applyOscillationGuard(
  proposed: NbaAction,
  recentActions: NbaAction[],
): NbaAction {
  if (!isActionOscillating(recentActions)) return proposed;

  if (
    proposed === "INCREASE_DIFFICULTY" ||
    proposed === "DECREASE_DIFFICULTY"
  ) {
    return "KEEP_AS_IS";
  }
  return proposed;
}
