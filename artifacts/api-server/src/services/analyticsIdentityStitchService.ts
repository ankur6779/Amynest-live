/**
 * Rewrites pre-auth `device:{deviceId}` analytics rows onto the Firebase uid
 * after sign-in so the anonymous install journey is stitchable.
 */
import { db, analyticsEventsTable } from "@workspace/db";
import { and, asc, eq, ne } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  isValidPreauthDeviceId,
  preauthUserId,
} from "./preauthAnalyticsService";
import { stitchAcquisitionAttribution } from "./acquisitionAttributionService";

export async function stitchDeviceAnalyticsIdentity(
  deviceId: string,
  authenticatedUserId: string,
): Promise<number> {
  const trimmedDevice = deviceId.trim();
  const userId = authenticatedUserId.trim();
  if (!isValidPreauthDeviceId(trimmedDevice)) return 0;
  if (!userId || userId.startsWith("device:")) return 0;

  const from = preauthUserId(trimmedDevice);
  if (from === userId) return 0;

  try {
    const result: { rowCount?: number | null } = await db
      .update(analyticsEventsTable)
      .set({ userId })
      .where(eq(analyticsEventsTable.userId, from));
    const count = result.rowCount ?? 0;
    if (count > 0) {
      logger.info(
        { evt: "analytics.identity_stitched", count, devicePrefix: trimmedDevice.slice(0, 8) },
        "stitched anonymous analytics identity onto authenticated user",
      );
    }
    await dedupeFirstOpen(userId);
    void stitchAcquisitionAttribution(trimmedDevice, userId);
    return count;
  } catch (err) {
    logger.warn(
      { err, evt: "analytics.identity_stitch_failed", devicePrefix: trimmedDevice.slice(0, 8) },
      "analytics identity stitch failed",
    );
    return 0;
  }
}

async function dedupeFirstOpen(userId: string): Promise<void> {
  const rows = await db
    .select({ id: analyticsEventsTable.id })
    .from(analyticsEventsTable)
    .where(
      and(
        eq(analyticsEventsTable.userId, userId),
        eq(analyticsEventsTable.eventName, "first_open"),
      ),
    )
    .orderBy(asc(analyticsEventsTable.serverTs), asc(analyticsEventsTable.id));
  if (rows.length <= 1) return;
  const keepId = rows[0]?.id;
  if (!keepId) return;
  await db
    .delete(analyticsEventsTable)
    .where(
      and(
        eq(analyticsEventsTable.userId, userId),
        eq(analyticsEventsTable.eventName, "first_open"),
        ne(analyticsEventsTable.id, keepId),
      ),
    );
}
