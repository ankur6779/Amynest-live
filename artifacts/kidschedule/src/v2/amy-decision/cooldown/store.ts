/**
 * Local Decision Cooldown adapter — versioned, injectable.
 * No remote sync. No UI.
 */

import {
  AMY_DECISION_COOLDOWN_STORAGE_KEY,
  type DecisionCooldownDocument,
} from "./types";
import { createEmptyCooldownDocument } from "./empty";
import { upgradeCooldownDocument } from "./upgrade";

export type DecisionCooldownStorageAdapter = {
  readDocument(): DecisionCooldownDocument;
  writeDocument(doc: DecisionCooldownDocument): void;
  clearDocument(): void;
};

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

export function createLocalCooldownAdapter(): DecisionCooldownStorageAdapter {
  return {
    readDocument() {
      if (!canUseStorage()) return createEmptyCooldownDocument();
      try {
        const raw = localStorage.getItem(AMY_DECISION_COOLDOWN_STORAGE_KEY);
        if (!raw) return createEmptyCooldownDocument();
        return (
          upgradeCooldownDocument(JSON.parse(raw)) ??
          createEmptyCooldownDocument()
        );
      } catch {
        return createEmptyCooldownDocument();
      }
    },
    writeDocument(doc) {
      if (!canUseStorage()) return;
      try {
        localStorage.setItem(
          AMY_DECISION_COOLDOWN_STORAGE_KEY,
          JSON.stringify(JSON.parse(JSON.stringify(doc))),
        );
      } catch {
        /* quota / private mode */
      }
    },
    clearDocument() {
      if (!canUseStorage()) return;
      try {
        localStorage.removeItem(AMY_DECISION_COOLDOWN_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    },
  };
}

export function createMemoryCooldownAdapter(
  initial: DecisionCooldownDocument | null = null,
): DecisionCooldownStorageAdapter {
  let doc = initial ?? createEmptyCooldownDocument();
  return {
    readDocument() {
      return doc;
    },
    writeDocument(next) {
      doc = next;
    },
    clearDocument() {
      doc = createEmptyCooldownDocument();
    },
  };
}

let defaultAdapter: DecisionCooldownStorageAdapter | null = null;

export function getDefaultCooldownAdapter(): DecisionCooldownStorageAdapter {
  if (!defaultAdapter) defaultAdapter = createLocalCooldownAdapter();
  return defaultAdapter;
}

export function setDefaultCooldownAdapterForTests(
  adapter: DecisionCooldownStorageAdapter | null,
): void {
  defaultAdapter = adapter;
}
