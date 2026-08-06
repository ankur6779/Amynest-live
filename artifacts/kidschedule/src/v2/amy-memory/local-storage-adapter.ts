/**
 * Sole localStorage write owner for Amy Memory documents.
 * Other V2 modules must not call localStorage for family facts.
 */

import { AMY_MEMORY_STORAGE_KEY } from "./keys";
import { upgradeMemoryDocument } from "./upgrade";
import type { AmyMemoryMutable } from "./types";

export type AmyMemoryStorageAdapter = {
  readRaw(): AmyMemoryMutable | null;
  writeRaw(doc: AmyMemoryMutable): void;
  clearRaw(): void;
};

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

/** Clone so callers never mutate frozen or shared refs. */
function cloneMutable(doc: AmyMemoryMutable): AmyMemoryMutable {
  return JSON.parse(JSON.stringify(doc)) as AmyMemoryMutable;
}

export function createLocalStorageAdapter(): AmyMemoryStorageAdapter {
  return {
    readRaw() {
      if (!canUseStorage()) return null;
      try {
        const raw = localStorage.getItem(AMY_MEMORY_STORAGE_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        const upgraded = upgradeMemoryDocument(parsed);
        return upgraded ? cloneMutable(upgraded) : null;
      } catch {
        return null;
      }
    },
    writeRaw(doc) {
      if (!canUseStorage()) return;
      try {
        const payload = cloneMutable(doc);
        localStorage.setItem(AMY_MEMORY_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        /* quota / private mode */
      }
    },
    clearRaw() {
      if (!canUseStorage()) return;
      try {
        localStorage.removeItem(AMY_MEMORY_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    },
  };
}

let defaultAdapter: AmyMemoryStorageAdapter | null = null;

export function getDefaultMemoryAdapter(): AmyMemoryStorageAdapter {
  if (!defaultAdapter) defaultAdapter = createLocalStorageAdapter();
  return defaultAdapter;
}

/** Tests may inject a memory adapter. */
export function setDefaultMemoryAdapterForTests(
  adapter: AmyMemoryStorageAdapter | null,
): void {
  defaultAdapter = adapter;
}
