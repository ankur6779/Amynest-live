import { and, eq, sql } from "drizzle-orm";
import {
  db,
  childrenTable,
  nutritionMealMemoryTable,
  type MealMemoryEntry,
  type MealOutcome,
} from "@workspace/db";

const MAX_ENTRIES = 500;

export function normalizeMealKey(mealName: string): string {
  return mealName
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function mergeEntries(
  server: MealMemoryEntry[],
  client: MealMemoryEntry[],
): MealMemoryEntry[] {
  const map = new Map<string, MealMemoryEntry>();
  for (const e of server) {
    map.set(`${e.dateKey}:${e.mealSlot}:${e.mealKey}`, e);
  }
  for (const e of client) {
    const key = `${e.dateKey}:${e.mealSlot}:${e.mealKey}`;
    const existing = map.get(key);
    if (!existing || Date.parse(e.updatedAt) >= Date.parse(existing.updatedAt)) {
      map.set(key, e);
    }
  }
  return [...map.values()]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, MAX_ENTRIES);
}

async function verifyChildOwner(childId: number, userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function getMealMemory(
  childId: number,
  userId: string,
): Promise<{ ok: false; error: "forbidden" } | { ok: true; entries: MealMemoryEntry[] }> {
  if (!(await verifyChildOwner(childId, userId))) {
    return { ok: false, error: "forbidden" };
  }

  const rows = await db
    .select()
    .from(nutritionMealMemoryTable)
    .where(and(eq(nutritionMealMemoryTable.childId, childId), eq(nutritionMealMemoryTable.userId, userId)))
    .limit(1);

  return { ok: true, entries: rows[0]?.entries ?? [] };
}

export async function saveMealMemory(
  childId: number,
  userId: string,
  entries: MealMemoryEntry[],
): Promise<{ ok: false; error: "forbidden" } | { ok: true; entries: MealMemoryEntry[] }> {
  if (!(await verifyChildOwner(childId, userId))) {
    return { ok: false, error: "forbidden" };
  }

  const sanitized = entries
    .filter((e) => e.mealKey && e.dateKey && e.outcome)
    .slice(0, MAX_ENTRIES);

  const existing = await db
    .select({ entries: nutritionMealMemoryTable.entries })
    .from(nutritionMealMemoryTable)
    .where(and(eq(nutritionMealMemoryTable.childId, childId), eq(nutritionMealMemoryTable.userId, userId)))
    .limit(1);

  const merged = mergeEntries(existing[0]?.entries ?? [], sanitized);

  const [row] = await db
    .insert(nutritionMealMemoryTable)
    .values({ childId, userId, entries: merged })
    .onConflictDoUpdate({
      target: [nutritionMealMemoryTable.childId],
      set: { entries: merged, userId, updatedAt: sql`now()` },
    })
    .returning();

  return { ok: true, entries: row!.entries };
}

export async function recordMealOutcome(
  childId: number,
  userId: string,
  input: {
    dateKey: string;
    mealSlot: string;
    mealName: string;
    outcome: MealOutcome;
  },
): Promise<{ ok: false; error: "forbidden" } | { ok: true; entries: MealMemoryEntry[] }> {
  const current = await getMealMemory(childId, userId);
  if (!current.ok) return current;

  const entry: MealMemoryEntry = {
    dateKey: input.dateKey,
    mealSlot: input.mealSlot,
    mealName: input.mealName,
    mealKey: normalizeMealKey(input.mealName),
    outcome: input.outcome,
    updatedAt: new Date().toISOString(),
  };

  const withoutDup = current.entries.filter(
    (e) => !(e.dateKey === entry.dateKey && e.mealSlot === entry.mealSlot && e.mealKey === entry.mealKey),
  );

  return saveMealMemory(childId, userId, [entry, ...withoutDup]);
}
