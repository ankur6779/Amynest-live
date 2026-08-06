/**
 * currentHistoryPointer — developer helper only.
 * Fast lookup of the current History tip. No UI.
 */

import { findCurrentHistory } from "./find";
import type {
  CurrentHistoryPointer,
  DecisionHistoryDocument,
  DecisionHistoryOutcomeState,
} from "./types";

/**
 * Resolve a machine-only pointer to the current History record.
 * Returns null when the document has no tip.
 */
export function currentHistoryPointer(
  document: DecisionHistoryDocument | null | undefined,
): CurrentHistoryPointer | null {
  const record = findCurrentHistory(document);
  if (!record || !document) return null;

  return Object.freeze({
    historyId: record.historyId,
    decisionId: record.decisionId,
    stabilityToken: record.stabilityToken,
    outcomeState: record.outcomeState as DecisionHistoryOutcomeState,
    recordedAt: record.recordedAt,
    historyHash: record.historyHash,
    documentUpdatedAt: document.updatedAt,
  });
}
