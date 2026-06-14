import {
  mealMemoryStorageKey,
  mergeMealMemoryEntries,
  normalizeMealKey,
  type MealMemoryEntry,
} from "@/features/nutrition/lib/nutrition-memory";
import type { MealOutcome } from "@/features/nutrition/lib/nutrition-memory.types";
import type { AuthFetchFn } from "@/features/nutrition/lib/nutrition-sync";
import { getApiUrl } from "@/lib/api";

type MemoryListener = () => void;
const listeners = new Set<MemoryListener>();

export function subscribeMealMemory(listener: MemoryListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  listeners.forEach((fn) => fn());
}

interface MealMemoryStoreV1 {
  version: 1;
  childId: number;
  entries: MealMemoryEntry[];
}

function defaultStore(childId: number): MealMemoryStoreV1 {
  return { version: 1, childId, entries: [] };
}

function readStore(childId: number): MealMemoryStoreV1 {
  if (typeof localStorage === "undefined") return defaultStore(childId);
  try {
    const raw = localStorage.getItem(mealMemoryStorageKey(childId));
    if (!raw) return defaultStore(childId);
    const parsed = JSON.parse(raw) as MealMemoryStoreV1;
    if (parsed.version !== 1) return defaultStore(childId);
    return { version: 1, childId, entries: parsed.entries ?? [] };
  } catch {
    return defaultStore(childId);
  }
}

function writeStore(childId: number, store: MealMemoryStoreV1): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(mealMemoryStorageKey(childId), JSON.stringify(store));
    notify();
  } catch {
    /* quota */
  }
}

export function loadMealMemoryEntries(childId: number): MealMemoryEntry[] {
  return readStore(childId).entries;
}

export function saveMealMemoryEntries(childId: number, entries: MealMemoryEntry[]): void {
  writeStore(childId, { version: 1, childId, entries: entries.slice(0, 500) });
}

export function recordLocalMealOutcome(
  childId: number,
  input: {
    dateKey: string;
    mealSlot: string;
    mealName: string;
    outcome: MealOutcome;
  },
): MealMemoryEntry[] {
  const store = readStore(childId);
  const entry: MealMemoryEntry = {
    dateKey: input.dateKey,
    mealSlot: input.mealSlot,
    mealName: input.mealName,
    mealKey: normalizeMealKey(input.mealName),
    outcome: input.outcome,
    updatedAt: new Date().toISOString(),
  };

  const next = [
    entry,
    ...store.entries.filter(
      (e) =>
        !(
          e.dateKey === entry.dateKey &&
          e.mealSlot === entry.mealSlot &&
          e.mealKey === entry.mealKey
        ),
    ),
  ].slice(0, 500);

  writeStore(childId, { version: 1, childId, entries: next });
  return next;
}

const QUEUE_KEY = "amynest:nutrition-memory-queue:";

function enqueueSync(childId: number): void {
  try {
    localStorage.setItem(`${QUEUE_KEY}${childId}`, String(Date.now()));
  } catch {
    /* quota */
  }
}

export async function hydrateMealMemory(
  childId: number,
  authFetch?: AuthFetchFn | null,
): Promise<MealMemoryEntry[]> {
  const local = loadMealMemoryEntries(childId);
  if (!authFetch || typeof navigator !== "undefined" && navigator.onLine === false) {
    return local;
  }

  try {
    const res = await authFetch(getApiUrl(`/api/nutrition/meal-memory?childId=${childId}`));
    if (res.ok) {
      const json = (await res.json()) as { entries?: MealMemoryEntry[] };
      const merged = mergeMealMemoryEntries(local, json.entries ?? []);
      saveMealMemoryEntries(childId, merged);
      await flushMealMemorySync(childId, authFetch);
      return merged;
    }
  } catch {
    /* offline */
  }

  return local;
}

export async function flushMealMemorySync(
  childId: number,
  authFetch?: AuthFetchFn | null,
): Promise<boolean> {
  if (!authFetch || (typeof navigator !== "undefined" && navigator.onLine === false)) {
    return false;
  }

  const entries = loadMealMemoryEntries(childId);
  try {
    const res = await authFetch(getApiUrl("/api/nutrition/meal-memory"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, entries }),
    });
    if (res.ok) {
      try {
        localStorage.removeItem(`${QUEUE_KEY}${childId}`);
      } catch {
        /* ignore */
      }
      return true;
    }
  } catch {
    /* offline */
  }
  return false;
}

export async function persistMealOutcome(
  childId: number,
  input: {
    dateKey: string;
    mealSlot: string;
    mealName: string;
    outcome: MealOutcome;
  },
  authFetch?: AuthFetchFn | null,
): Promise<MealMemoryEntry[]> {
  const entries = recordLocalMealOutcome(childId, input);
  enqueueSync(childId);

  if (authFetch && (typeof navigator === "undefined" || navigator.onLine !== false)) {
    try {
      await authFetch(getApiUrl("/api/nutrition/meal-outcome"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, ...input }),
      });
    } catch {
      void flushMealMemorySync(childId, authFetch);
    }
  }

  return entries;
}

export function clearMealMemoryStorage(childId: number): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(mealMemoryStorageKey(childId));
  notify();
}
