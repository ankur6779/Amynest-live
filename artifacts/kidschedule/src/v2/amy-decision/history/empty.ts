import { freezeDeep } from "../freeze";
import {
  AMY_DECISION_HISTORY_VERSION,
  type DecisionHistoryDocument,
} from "./types";

export function createEmptyDecisionHistoryDocument(
  now: Date = new Date(),
): DecisionHistoryDocument {
  return freezeDeep({
    schemaVersion: AMY_DECISION_HISTORY_VERSION,
    records: Object.freeze([]) as ReadonlyArray<never>,
    currentHistoryId: null,
    updatedAt: now.toISOString(),
  });
}
