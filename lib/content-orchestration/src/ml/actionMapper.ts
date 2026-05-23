import type { RealtimeDecision } from "../realtime/types.js";
import type { NbaAction } from "./types.js";

export function nbaActionToRealtimeDecision(action: NbaAction): RealtimeDecision {
  switch (action) {
    case "INCREASE_DIFFICULTY":
      return {
        action: "ADJUST_DIFFICULTY",
        payload: { direction: "up", delta: 0.35 },
        reason: "nba_increase_difficulty",
      };
    case "DECREASE_DIFFICULTY":
      return {
        action: "ADJUST_DIFFICULTY",
        payload: { direction: "down", delta: 0.5 },
        reason: "nba_decrease_difficulty",
      };
    case "SWAP_CONTENT":
      return {
        action: "SWAP_CONTENT",
        payload: { strategy: "fresh_module" },
        reason: "nba_swap_content",
      };
    case "INJECT_REWARD":
      return {
        action: "INJECT_REWARD",
        payload: { slot: "next" },
        reason: "nba_inject_reward",
      };
    case "INTRODUCE_EXPLORATION":
      return {
        action: "SWAP_CONTENT",
        payload: { strategy: "exploration", exploration: true },
        reason: "nba_introduce_exploration",
      };
    case "KEEP_AS_IS":
    default:
      return { action: "NOOP", payload: {}, reason: "nba_keep_as_is" };
  }
}

export function realtimeActionToNba(
  decision: RealtimeDecision,
): NbaAction {
  if (decision.action === "ADJUST_DIFFICULTY") {
    return decision.payload.direction === "down"
      ? "DECREASE_DIFFICULTY"
      : "INCREASE_DIFFICULTY";
  }
  if (decision.action === "SWAP_CONTENT") {
    return decision.payload.exploration ? "INTRODUCE_EXPLORATION" : "SWAP_CONTENT";
  }
  if (decision.action === "INJECT_REWARD") return "INJECT_REWARD";
  return "KEEP_AS_IS";
}
