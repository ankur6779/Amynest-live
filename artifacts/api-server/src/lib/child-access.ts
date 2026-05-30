/**
 * Shared child access checks — owner + co-parent caregivers.
 */
import { and, eq } from "drizzle-orm";
import {
  db,
  childrenTable,
  childCaregiversTable,
} from "@workspace/db";

export type AccessibleChild = {
  id: number;
  ageMonths: number;
  name: string;
  userId: string;
};

export async function canAccessChild(
  childId: number,
  userId: string,
): Promise<AccessibleChild | null> {
  const childRows = await db
    .select({
      id: childrenTable.id,
      ageMonths: childrenTable.ageMonths,
      age: childrenTable.age,
      name: childrenTable.name,
      userId: childrenTable.userId,
    })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);

  if (childRows[0]) {
    const c = childRows[0];
    return {
    id: c.id,
    name: c.name,
    userId: c.userId ?? userId,
    ageMonths: c.age * 12 + c.ageMonths,
  };
  }

  const caregiverRows = await db
    .select({
      id: childrenTable.id,
      ageMonths: childrenTable.ageMonths,
      age: childrenTable.age,
      name: childrenTable.name,
      userId: childrenTable.userId,
    })
    .from(childCaregiversTable)
    .innerJoin(childrenTable, eq(childrenTable.id, childCaregiversTable.childId))
    .where(
      and(
        eq(childCaregiversTable.childId, childId),
        eq(childCaregiversTable.userId, userId),
        eq(childCaregiversTable.status, "active"),
      ),
    )
    .limit(1);

  const cg = caregiverRows[0];
  if (!cg) return null;
  return {
    id: cg.id,
    name: cg.name,
    userId: cg.userId ?? userId,
    ageMonths: cg.age * 12 + cg.ageMonths,
  };
}

export async function isChildOwner(
  childId: number,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

/** All user IDs that should receive infant notifications for a child. */
export async function listChildCaregiverUserIds(
  childId: number,
): Promise<string[]> {
  const childRows = await db
    .select({ userId: childrenTable.userId })
    .from(childrenTable)
    .where(eq(childrenTable.id, childId))
    .limit(1);

  const ownerId = childRows[0]?.userId;
  if (!ownerId) return [];

  const coParents = await db
    .select({ userId: childCaregiversTable.userId })
    .from(childCaregiversTable)
    .where(
      and(
        eq(childCaregiversTable.childId, childId),
        eq(childCaregiversTable.status, "active"),
      ),
    );

  const ids = new Set<string>([ownerId]);
  for (const row of coParents) ids.add(row.userId);
  return [...ids];
}
