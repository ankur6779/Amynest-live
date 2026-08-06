/**
 * Deterministic historyId — machine only.
 */

import type { DecisionHistoryOutcomeState } from "./types";

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function computeHistoryId(args: {
  stabilityToken: string;
  decisionId: string;
  outcomeState: DecisionHistoryOutcomeState;
  previousHistoryId: string | null;
  recordedAt: string;
}): string {
  const payload = {
    stabilityToken: args.stabilityToken,
    decisionId: args.decisionId,
    outcomeState: args.outcomeState,
    previousHistoryId: args.previousHistoryId,
    recordedAt: args.recordedAt,
  };
  return `hist_v1_${fnv1a(JSON.stringify(payload))}`;
}
