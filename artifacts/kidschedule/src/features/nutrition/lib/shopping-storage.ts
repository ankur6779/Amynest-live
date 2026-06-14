import type { GroceryItem } from "@/features/nutrition/lib/grocery-generator";

const STORAGE_PREFIX = "nutrition:shopping:";

function weekKey(ref = new Date()): string {
  const d = new Date(ref);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export function shoppingStorageKey(householdId = "default"): string {
  return `${STORAGE_PREFIX}${householdId}:${weekKey()}`;
}

export function loadCheckedIds(householdId = "default"): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(shoppingStorageKey(householdId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

export function saveCheckedIds(ids: Set<string>, householdId = "default"): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(shoppingStorageKey(householdId), JSON.stringify([...ids]));
  } catch {
    /* quota */
  }
}

export function toggleCheckedId(id: string, householdId = "default"): Set<string> {
  const set = loadCheckedIds(householdId);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  saveCheckedIds(set, householdId);
  return set;
}

export function flattenGroceryItems(
  groups: Array<{ items: GroceryItem[] }>,
): GroceryItem[] {
  return groups.flatMap((g) => g.items);
}

export function shoppingProgress(
  items: GroceryItem[],
  checked: Set<string>,
): { done: number; total: number } {
  const total = items.length;
  const done = items.filter((i) => checked.has(i.id)).length;
  return { done, total };
}

/** True if any shopping-mode checklist was saved for this household prefix. */
export function hasAnyShoppingActivity(householdPrefix: string): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${STORAGE_PREFIX}${householdPrefix}`)) return true;
    }
  } catch {
    return false;
  }
  return false;
}
