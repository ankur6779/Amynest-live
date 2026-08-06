/**
 * Local Decision History adapter — versioned, injectable.
 * No server sync. No UI. Sole localStorage writer for History.
 */

import {
  AMY_DECISION_HISTORY_STORAGE_KEY,
  type DecisionHistoryDocument,
} from "./types";
import { createEmptyDecisionHistoryDocument } from "./empty";
import { upgradeHistoryDocument } from "./upgrade";

export type DecisionHistoryStorageAdapter = {
  readDocument(): DecisionHistoryDocument;
  writeDocument(doc: DecisionHistoryDocument): void;
  clearDocument(): void;
};

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

export function createLocalHistoryAdapter(): DecisionHistoryStorageAdapter {
  return {
    readDocument() {
      if (!canUseStorage()) return createEmptyDecisionHistoryDocument();
      try {
        const raw = localStorage.getItem(AMY_DECISION_HISTORY_STORAGE_KEY);
        if (!raw) return createEmptyDecisionHistoryDocument();
        const parsed: unknown = JSON.parse(raw);
        return (
          upgradeHistoryDocument(parsed) ?? createEmptyDecisionHistoryDocument()
        );
      } catch {
        return createEmptyDecisionHistoryDocument();
      }
    },
    writeDocument(doc) {
      if (!canUseStorage()) return;
      try {
        const payload = JSON.parse(JSON.stringify(doc));
        localStorage.setItem(
          AMY_DECISION_HISTORY_STORAGE_KEY,
          JSON.stringify(payload),
        );
      } catch {
        /* quota / private mode */
      }
    },
    clearDocument() {
      if (!canUseStorage()) return;
      try {
        localStorage.removeItem(AMY_DECISION_HISTORY_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    },
  };
}

export function createMemoryHistoryAdapter(
  initial: DecisionHistoryDocument | null = null,
): DecisionHistoryStorageAdapter {
  let doc = initial ?? createEmptyDecisionHistoryDocument();
  return {
    readDocument() {
      return doc;
    },
    writeDocument(next) {
      doc = next;
    },
    clearDocument() {
      doc = createEmptyDecisionHistoryDocument();
    },
  };
}

let defaultAdapter: DecisionHistoryStorageAdapter | null = null;

export function getDefaultHistoryAdapter(): DecisionHistoryStorageAdapter {
  if (!defaultAdapter) defaultAdapter = createLocalHistoryAdapter();
  return defaultAdapter;
}

/** Tests may inject a history adapter. */
export function setDefaultHistoryAdapterForTests(
  adapter: DecisionHistoryStorageAdapter | null,
): void {
  defaultAdapter = adapter;
}
