import { randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  childrenTable,
  nutritionCaregiverShareTable,
  type CaregiverSharePayload,
} from "@workspace/db";

function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}

async function verifyChildrenOwner(userId: string, childIds: number[]): Promise<boolean> {
  if (childIds.length === 0) return false;
  const rows = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(and(eq(childrenTable.userId, userId), inArray(childrenTable.id, childIds)));
  return rows.length === childIds.length;
}

export async function createCaregiverShareLink(
  userId: string,
  childIds: number[],
  payload: CaregiverSharePayload,
  ttlDays = 7,
): Promise<{ ok: false; error: string } | { ok: true; shareToken: string; expiresAt: string }> {
  if (!(await verifyChildrenOwner(userId, childIds))) {
    return { ok: false, error: "forbidden" };
  }

  const shareToken = generateShareToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);

  await db.insert(nutritionCaregiverShareTable).values({
    userId,
    shareToken,
    childIds,
    payload,
    expiresAt,
  });

  return { ok: true, shareToken, expiresAt: expiresAt.toISOString() };
}

export async function getCaregiverShareView(shareToken: string): Promise<
  | { ok: false; error: "not_found" | "expired" }
  | {
      ok: true;
      readOnly: true;
      expiresAt: string;
      payload: CaregiverSharePayload;
    }
> {
  const rows = await db
    .select()
    .from(nutritionCaregiverShareTable)
    .where(eq(nutritionCaregiverShareTable.shareToken, shareToken))
    .limit(1);

  const row = rows[0];
  if (!row) return { ok: false, error: "not_found" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, error: "expired" };

  return {
    ok: true,
    readOnly: true,
    expiresAt: row.expiresAt.toISOString(),
    payload: row.payload,
  };
}
