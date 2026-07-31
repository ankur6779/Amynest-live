import type { LearningEvent, OfflineQueueStorage } from "./types.js";

/**
 * localStorage-backed offline queue (browser host).
 * Pure helper — call only when `localStorage` exists.
 */
export function createLocalStorageOfflineQueue(
  storageKey: string,
): OfflineQueueStorage {
  return {
    load() {
      try {
        if (typeof localStorage === "undefined") return [];
        const raw = localStorage.getItem(storageKey);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as LearningEvent[];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    save(events) {
      try {
        if (typeof localStorage === "undefined") return;
        localStorage.setItem(storageKey, JSON.stringify(events));
      } catch {
        /* quota */
      }
    },
  };
}

export function createMemoryOfflineQueue(
  seed: LearningEvent[] = [],
): OfflineQueueStorage {
  let events = [...seed];
  return {
    load: () => [...events],
    save: (next) => {
      events = [...next];
    },
  };
}
