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
  /** Whole years from the child profile. */
  age: number;
  /** 0–11 month remainder from the child profile (not total months). */
  ageMonthsPart: number;
  /** Total age in months (age * 12 + ageMonthsPart). */
  ageMonths: number;
  name: string;
  userId: string;
  dietType: string | null;
  allergies: string | null;
};

function toAccessibleChild(row: {
  id: number;
  age: number;
  ageMonths: number;
  name: string;
  userId: string | null;
  dietType: string | null;
  allergies: string | null;
}, fallbackUserId: string): AccessibleChild {
  const ageMonthsPart = row.ageMonths;
  return {
    id: row.id,
    age: row.age,
    ageMonthsPart,
    ageMonths: row.age * 12 + ageMonthsPart,
    name: row.name,
    userId: row.userId ?? fallbackUserId,
    dietType: row.dietType,
    allergies: row.allergies,
  };
}

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
      dietType: childrenTable.dietType,
      allergies: childrenTable.allergies,
    })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);

  if (childRows[0]) {
    return toAccessibleChild(childRows[0], userId);
  }

  const caregiverRows = await db
    .select({
      id: childrenTable.id,
      ageMonths: childrenTable.ageMonths,
      age: childrenTable.age,
      name: childrenTable.name,
      userId: childrenTable.userId,
      dietType: childrenTable.dietType,
      allergies: childrenTable.allergies,
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
  return toAccessibleChild(cg, userId);
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
