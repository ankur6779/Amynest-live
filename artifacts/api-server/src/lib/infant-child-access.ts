import { and, eq } from "drizzle-orm";
import { db, childrenTable, childCaregiversTable } from "@workspace/db";
import { isInfantAgeMonths, parseChildIdFromBody, totalAgeMonths } from "./infant-age.js";
import { canAccessChild } from "./child-access.js";

export { parseChildIdFromBody } from "./infant-age.js";

/**
 * Derive infant quota routing from DB only.
 * When childId is present, uses that child's stored age; otherwise any infant in the household.
 */
export async function resolveInfantAiQuotaFromDb(
  userId: string,
  body: unknown,
): Promise<boolean> {
  const childId = parseChildIdFromBody(body);
  if (childId != null) {
    const child = await canAccessChild(childId, userId);
    if (child) {
      return isInfantAgeMonths(child.ageMonths);
    }
  }
  return userHasInfantChild(userId);
}

/** True when the user cares for at least one child under 24 months. */
export async function userHasInfantChild(userId: string): Promise<boolean> {
  const owned = await db
    .select({
      age: childrenTable.age,
      ageMonths: childrenTable.ageMonths,
    })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId));

  const shared = await db
    .select({
      age: childrenTable.age,
      ageMonths: childrenTable.ageMonths,
    })
    .from(childCaregiversTable)
    .innerJoin(childrenTable, eq(childCaregiversTable.childId, childrenTable.id))
    .where(
      and(
        eq(childCaregiversTable.userId, userId),
        eq(childCaregiversTable.status, "active"),
      ),
    );

  return [...owned, ...shared].some((row) =>
    isInfantAgeMonths(totalAgeMonths(row.age ?? 0, row.ageMonths ?? 0)),
  );
}
