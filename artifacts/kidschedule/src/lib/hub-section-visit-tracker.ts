import type { HubGroupKey } from "@/lib/parent-hub-premium";

const STORAGE_KEY = "amynest:hub:section-visits";

type VisitStore = Record<string, number>;

function storeKey(childId: number, groupKey: HubGroupKey): string {
  return `${childId}:${groupKey}`;
}

function readStore(): VisitStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as VisitStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: VisitStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

/** Record that a hub section group was opened for this child. */
export function recordHubSectionVisit(childId: number, groupKey: HubGroupKey): void {
  if (!childId || !groupKey) return;
  const store = readStore();
  store[storeKey(childId, groupKey)] = Date.now();
  writeStore(store);
}

export function getHubSectionVisitAt(childId: number, groupKey: HubGroupKey): number | null {
  const ts = readStore()[storeKey(childId, groupKey)];
  return typeof ts === "number" && ts > 0 ? ts : null;
}

/** Most recently opened group for this child, if any. */
export function getLastVisitedHubSection(
  childId: number,
  groupKeys: readonly HubGroupKey[],
): { key: HubGroupKey; at: number } | null {
  let best: { key: HubGroupKey; at: number } | null = null;
  for (const key of groupKeys) {
    const at = getHubSectionVisitAt(childId, key);
    if (at == null) continue;
    if (!best || at > best.at) best = { key, at };
  }
  return best;
}

export function hasVisitedHubSection(childId: number, groupKey: HubGroupKey): boolean {
  return getHubSectionVisitAt(childId, groupKey) != null;
}

/** Clear visits — test helper only. */
export function clearHubSectionVisitsForTests(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
