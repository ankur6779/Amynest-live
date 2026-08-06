/**
 * Developer helpers over the History store.
 * Persistence optional via injectable adapter — engine remains pure via recordDecisionHistory.
 */

import type { StableDecisionResult } from "../stability/types";
import { findCurrentHistory, findHistoryByDecision } from "./find";
import { currentHistoryPointer } from "./pointer";
import { recordDecisionHistory } from "./record";
import {
  getDefaultHistoryAdapter,
  type DecisionHistoryStorageAdapter,
} from "./store";
import type {
  CurrentHistoryPointer,
  DecisionHistoryDocument,
  DecisionHistoryRecord,
  RecordDecisionHistoryOptions,
  RecordDecisionHistoryResult,
} from "./types";
import { AMY_DECISION_HISTORY_VERSION } from "./types";
import { createEmptyDecisionHistoryDocument } from "./empty";

function adapterOrDefault(
  adapter?: DecisionHistoryStorageAdapter | null,
): DecisionHistoryStorageAdapter {
  return adapter ?? getDefaultHistoryAdapter();
}

/** Read full history document (survives restart via local adapter). */
export function getDecisionHistory(
  adapter?: DecisionHistoryStorageAdapter | null,
): DecisionHistoryDocument {
  return adapterOrDefault(adapter).readDocument();
}

/** Current tip record. */
export function getCurrentDecisionHistory(
  adapter?: DecisionHistoryStorageAdapter | null,
): DecisionHistoryRecord | null {
  return findCurrentHistory(adapterOrDefault(adapter).readDocument());
}

/**
 * Developer-only fast tip pointer (no UI).
 * Prefer for quick current-History lookup without scanning.
 */
export function getCurrentHistoryPointer(
  adapter?: DecisionHistoryStorageAdapter | null,
): CurrentHistoryPointer | null {
  return currentHistoryPointer(adapterOrDefault(adapter).readDocument());
}

/**
 * Record StableDecisionResult into the store (append-only rules).
 * Thin wrapper: pure recordDecisionHistory + adapter write.
 */
export function appendDecisionHistory(
  stable: StableDecisionResult,
  options: RecordDecisionHistoryOptions & {
    adapter?: DecisionHistoryStorageAdapter | null;
  } = {},
): RecordDecisionHistoryResult {
  const store = adapterOrDefault(options.adapter);
  const current = store.readDocument();
  const result = recordDecisionHistory(stable, current, { now: options.now });
  if (result.recorded) {
    store.writeDocument(result.document);
  }
  return result;
}

/** Dev/test helper — clears local history. Not used by production shells. */
export function clearDecisionHistory(
  adapter?: DecisionHistoryStorageAdapter | null,
): void {
  adapterOrDefault(adapter).clearDocument();
}

/** Export serializable snapshot for QA. No import API. */
export function exportDecisionHistory(
  adapter?: DecisionHistoryStorageAdapter | null,
): Readonly<{
  schemaVersion: string;
  exportedAt: string;
  document: DecisionHistoryDocument;
}> {
  const document = adapterOrDefault(adapter).readDocument();
  return Object.freeze({
    schemaVersion: AMY_DECISION_HISTORY_VERSION,
    exportedAt: new Date().toISOString(),
    document,
  });
}

export {
  findCurrentHistory,
  findHistoryByDecision,
  createEmptyDecisionHistoryDocument,
  currentHistoryPointer,
};
