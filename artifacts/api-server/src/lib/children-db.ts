import { and, asc, eq, getTableColumns } from "drizzle-orm";
import { db, childrenTable, type Child, type InsertChild } from "@workspace/db";
import { isMissingColumnError } from "./db-safe.js";
import { logger } from "./logger.js";

export type ChildFixedActivity = {
  activity: string;
  days: string[];
  start: string;
  end: string;
};

const allChildColumns = getTableColumns(childrenTable);
const { fixedActivities: _fixedActivitiesCol, ...childColumnsWithoutFixedActivities } =
  allChildColumns;

/** null = unknown, false = confirmed missing on this process */
let fixedActivitiesColumnOk: boolean | null = null;

export function getFixedActivitiesFromChild(child: unknown): ChildFixedActivity[] {
  if (!child || typeof child !== "object") return [];
  const raw = (child as { fixedActivities?: unknown }).fixedActivities;
  if (!Array.isArray(raw)) return [];
  return raw as ChildFixedActivity[];
}

export function normalizeChildRow<T extends Record<string, unknown>>(
  row: T,
): T & { fixedActivities: ChildFixedActivity[] | null } {
  const fixed = (row as { fixedActivities?: unknown }).fixedActivities;
  if (fixed === undefined || fixed === null) {
    return { ...row, fixedActivities: [] };
  }
  return {
    ...row,
    fixedActivities: Array.isArray(fixed) ? (fixed as ChildFixedActivity[]) : [],
  };
}

function noteFixedActivitiesMissing(err: unknown): void {
  if (!isMissingColumnError(err, "fixed_activities")) return;
  if (fixedActivitiesColumnOk === false) return;
  fixedActivitiesColumnOk = false;
  logger.warn(
    { evt: "db.children.fixed_activities_missing" },
    'children.fixed_activities column missing — reads use legacy select; writes omit column; default []',
  );
}

function stripFixedActivities<T extends Record<string, unknown>>(
  values: T,
): Omit<T, "fixedActivities"> {
  const { fixedActivities: _fa, ...rest } = values as T & { fixedActivities?: unknown };
  return rest;
}

/** Minimal child columns for joins that only need id + name (notification cron). */
export const childIdNameSelect = {
  id: childrenTable.id,
  name: childrenTable.name,
} as const;

export async function listChildrenForUser(userId: string): Promise<Child[]> {
  try {
    if (fixedActivitiesColumnOk === false) {
      const rows = await db
        .select(childColumnsWithoutFixedActivities)
        .from(childrenTable)
        .where(eq(childrenTable.userId, userId))
        .orderBy(asc(childrenTable.createdAt), asc(childrenTable.id));
      return rows.map((r) => normalizeChildRow(r) as Child);
    }
    const rows = await db
      .select()
      .from(childrenTable)
      .where(eq(childrenTable.userId, userId))
      .orderBy(asc(childrenTable.createdAt), asc(childrenTable.id));
    fixedActivitiesColumnOk = true;
    return rows.map((r) => normalizeChildRow(r) as Child);
  } catch (err) {
    noteFixedActivitiesMissing(err);
    if (fixedActivitiesColumnOk === false) {
      const rows = await db
        .select(childColumnsWithoutFixedActivities)
        .from(childrenTable)
        .where(eq(childrenTable.userId, userId))
        .orderBy(asc(childrenTable.createdAt), asc(childrenTable.id));
      return rows.map((r) => normalizeChildRow(r) as Child);
    }
    throw err;
  }
}

export async function getChildByIdForUser(
  childId: number,
  userId: string,
): Promise<Child | undefined> {
  try {
    if (fixedActivitiesColumnOk === false) {
      const [row] = await db
        .select(childColumnsWithoutFixedActivities)
        .from(childrenTable)
        .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)));
      return row ? (normalizeChildRow(row) as Child) : undefined;
    }
    const [row] = await db
      .select()
      .from(childrenTable)
      .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)));
    if (row) fixedActivitiesColumnOk = true;
    return row ? (normalizeChildRow(row) as Child) : undefined;
  } catch (err) {
    noteFixedActivitiesMissing(err);
    if (fixedActivitiesColumnOk === false) {
      const [row] = await db
        .select(childColumnsWithoutFixedActivities)
        .from(childrenTable)
        .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)));
      return row ? (normalizeChildRow(row) as Child) : undefined;
    }
    throw err;
  }
}

export async function insertChildRow(
  values: InsertChild & { userId: string },
): Promise<Child> {
  try {
    const [child] = await db.insert(childrenTable).values(values).returning();
    fixedActivitiesColumnOk = true;
    return normalizeChildRow(child) as Child;
  } catch (err) {
    noteFixedActivitiesMissing(err);
    if (
      isMissingColumnError(err, "fixed_activities") &&
      (values as { fixedActivities?: unknown }).fixedActivities !== undefined
    ) {
      const [child] = await db
        .insert(childrenTable)
        .values(stripFixedActivities(values))
        .returning();
      return normalizeChildRow({ ...child, fixedActivities: [] }) as Child;
    }
    throw err;
  }
}

export async function updateChildRow(
  childId: number,
  userId: string,
  values: Partial<InsertChild>,
): Promise<Child | undefined> {
  try {
    const [child] = await db
      .update(childrenTable)
      .set(values)
      .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
      .returning();
    if (child) fixedActivitiesColumnOk = true;
    return child ? (normalizeChildRow(child) as Child) : undefined;
  } catch (err) {
    noteFixedActivitiesMissing(err);
    if (
      isMissingColumnError(err, "fixed_activities") &&
      (values as { fixedActivities?: unknown }).fixedActivities !== undefined
    ) {
      const [child] = await db
        .update(childrenTable)
        .set(stripFixedActivities(values))
        .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
        .returning();
      return child ? (normalizeChildRow({ ...child, fixedActivities: [] }) as Child) : undefined;
    }
    throw err;
  }
}
