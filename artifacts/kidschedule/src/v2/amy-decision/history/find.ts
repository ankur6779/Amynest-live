import type {
  DecisionHistoryDocument,
  DecisionHistoryRecord,
} from "./types";

/** Current tip — record referenced by currentHistoryId, else last append. */
export function findCurrentHistory(
  document: DecisionHistoryDocument | null | undefined,
): DecisionHistoryRecord | null {
  if (!document || document.records.length === 0) return null;
  if (document.currentHistoryId) {
    const found = document.records.find(
      (r) => r.historyId === document.currentHistoryId,
    );
    if (found) return found;
  }
  return document.records[document.records.length - 1] ?? null;
}

/** All records for a decisionId (oldest → newest). */
export function findHistoryByDecision(
  document: DecisionHistoryDocument | null | undefined,
  decisionId: string,
): ReadonlyArray<DecisionHistoryRecord> {
  if (!document) return Object.freeze([]);
  return Object.freeze(
    document.records.filter((r) => r.decisionId === decisionId),
  );
}

/** Lookup by historyId. */
export function findHistoryById(
  document: DecisionHistoryDocument | null | undefined,
  historyId: string,
): DecisionHistoryRecord | null {
  if (!document) return null;
  return document.records.find((r) => r.historyId === historyId) ?? null;
}
