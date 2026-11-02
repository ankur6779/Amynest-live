/**
 * Rewrites pre-auth `device:{deviceId}` analytics rows onto the Firebase uid
 * after sign-in so the anonymous install journey is stitchable.
 */
import { db, analyticsEventsTable } from "@workspace/db";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  isValidPreauthDeviceId,
  preauthUserId,
} from "./preauthAnalyticsService";
import { stitchAcquisitionAttribution } from "./acquisitionAttributionService";
import { analyticsSpineColumnsReady } from "./analyticsSpine";

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
    const columnsReady = await analyticsSpineColumnsReady();
    const result: { rowCount?: number | null } = await db
      .update(analyticsEventsTable)
      .set(
        columnsReady
          ? {
              userId,
              canonicalUserId: userId,
              firebaseUid: userId,
              anonymousDeviceId: trimmedDevice,
            }
          : { userId },
      )
      .where(eq(analyticsEventsTable.userId, from));
    const count = result.rowCount ?? 0;
    await db.execute(sql`
      UPDATE analytics_events
      SET props = COALESCE(props, '{}'::jsonb) || jsonb_build_object(
        'canonical_user_id', ${userId}::text,
        'firebase_uid', ${userId}::text,
        'anonymous_device_id', COALESCE(
          NULLIF(props->>'anonymous_device_id', ''),
          NULLIF(props->>'device_id', ''),
          ${trimmedDevice}::text
        )
      )
      WHERE user_id = ${userId}
        AND (
          COALESCE(props->>'anonymous_device_id', '') IN ('', ${trimmedDevice})
          OR COALESCE(props->>'device_id', '') = ${trimmedDevice}
        )
    `);
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
