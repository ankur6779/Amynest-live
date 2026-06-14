import type { MealOutcome } from "@/features/nutrition/lib/nutrition-memory.types";

export interface MealMemoryEntry {
  dateKey: string;
  mealSlot: string;
  mealName: string;
  mealKey: string;
  outcome: MealOutcome;
  updatedAt: string;
}

export interface MealMemoryStats {
  mealKey: string;
  mealName: string;
  loved: number;
  some: number;
  skipped: number;
  total: number;
}

export interface MealMemorySummaryLine {
  mealName: string;
  lovedCount: number;
  text: string;
}

export function normalizeMealKey(mealName: string): string {
  return mealName
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function mealMemoryStorageKey(childId: number): string {
  return `nutrition:meal-memory:${childId}`;
}

export function aggregateMealStats(entries: MealMemoryEntry[]): MealMemoryStats[] {
  const map = new Map<string, MealMemoryStats>();

  for (const e of entries) {
    const existing = map.get(e.mealKey) ?? {
      mealKey: e.mealKey,
      mealName: e.mealName,
      loved: 0,
      some: 0,
      skipped: 0,
      total: 0,
    };
    existing.total++;
    if (e.outcome === "loved") existing.loved++;
    else if (e.outcome === "some") existing.some++;
    else existing.skipped++;
    if (e.mealName.length > existing.mealName.length) existing.mealName = e.mealName;
    map.set(e.mealKey, existing);
  }

  return [...map.values()].sort((a, b) => b.loved - a.loved || b.total - a.total);
}

export function filterEntriesForMonth(entries: MealMemoryEntry[], ref = new Date()): MealMemoryEntry[] {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  return entries.filter((e) => {
    const [ey, em] = e.dateKey.split("-").map(Number);
    return ey === y && em! - 1 === m;
  });
}

export function buildMealMemorySummary(
  entries: MealMemoryEntry[],
  childName: string,
  ref = new Date(),
): MealMemorySummaryLine[] {
  const monthEntries = filterEntriesForMonth(entries, ref);
  const stats = aggregateMealStats(monthEntries);
  const accepted = stats.filter((s) => s.loved > 0 || s.some > 0);

  return accepted.slice(0, 5).map((s) => {
    const count = s.loved + s.some;
    const name = childName.trim() || "Your child";
    const label = shortenMealName(s.mealName);
    return {
      mealName: s.mealName,
      lovedCount: s.loved,
      text:
        s.loved >= s.some
          ? `${name} accepted ${label} ${count} time${count === 1 ? "" : "s"} this month.`
          : `${name} tried ${label} ${count} time${count === 1 ? "" : "s"} this month.`,
    };
  });
}

export function shortenMealName(name: string): string {
  const primary = name.split(/[+/,]/)[0]?.trim() ?? name;
  return primary.length > 40 ? `${primary.slice(0, 37)}…` : primary;
}

export function countSkippedRecently(
  entries: MealMemoryEntry[],
  mealKey: string,
  withinDays = 30,
  ref = new Date(),
): number {
  const cutoff = new Date(ref);
  cutoff.setDate(cutoff.getDate() - withinDays);

  return entries.filter((e) => {
    if (e.mealKey !== mealKey || e.outcome !== "skipped") return false;
    const d = new Date(e.dateKey);
    return d >= cutoff;
  }).length;
}

export function countLoved(entries: MealMemoryEntry[], mealKey: string): number {
  return entries.filter((e) => e.mealKey === mealKey && e.outcome === "loved").length;
}

export function mealAcceptanceRate(entries: MealMemoryEntry[]): number {
  if (entries.length === 0) return 0;
  const positive = entries.filter((e) => e.outcome === "loved" || e.outcome === "some").length;
  return Math.round((positive / entries.length) * 100);
}

export function favoriteMealKeys(entries: MealMemoryEntry[], limit = 5): string[] {
  return aggregateMealStats(entries)
    .filter((s) => s.loved > 0)
    .slice(0, limit)
    .map((s) => s.mealKey);
}

export function skippedMealKeys(entries: MealMemoryEntry[], withinDays = 30): string[] {
  const stats = aggregateMealStats(entries);
  return stats
    .filter((s) => countSkippedRecently(entries, s.mealKey, withinDays) >= 2)
    .map((s) => s.mealKey);
}

export function mergeMealMemoryEntries(
  local: MealMemoryEntry[],
  server: MealMemoryEntry[],
): MealMemoryEntry[] {
  const map = new Map<string, MealMemoryEntry>();
  for (const e of server) map.set(`${e.dateKey}:${e.mealSlot}:${e.mealKey}`, e);
  for (const e of local) {
    const key = `${e.dateKey}:${e.mealSlot}:${e.mealKey}`;
    const existing = map.get(key);
    if (!existing || Date.parse(e.updatedAt) >= Date.parse(existing.updatedAt)) {
      map.set(key, e);
    }
  }
  return [...map.values()]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 500);
}
