import {
  crashEventsTable,
  crashRegressionsTable,
  db,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../../lib/logger.js";
import { CRASH_REGRESSION_REGISTRY } from "./regression-registry.js";
import type { CrashEventIngestPayload } from "./types.js";

function resolveReadableFingerprint(
  payload: CrashEventIngestPayload,
): string {
  if (payload.readableFingerprint) return payload.readableFingerprint;
  const fromMeta =
    typeof payload.meta?.readableFingerprint === "string"
      ? payload.meta.readableFingerprint
      : undefined;
  if (fromMeta) return fromMeta;
  const component =
    typeof payload.meta?.component === "string"
      ? payload.meta.component
      : "Unknown";
  return `${component.replace(/\s+/g, "")}|Error`;
}

export async function persistCrashEvent(
  payload: CrashEventIngestPayload,
): Promise<void> {
  const readableFingerprint = resolveReadableFingerprint(payload);
  const ts = payload.timestamp ? new Date(payload.timestamp) : new Date();

  await db.insert(crashEventsTable).values({
    errorId: payload.errorId.slice(0, 64),
    fingerprint: payload.fingerprint.slice(0, 64),
    readableFingerprint: readableFingerprint.slice(0, 256),
    route: payload.route?.slice(0, 256) ?? null,
    message: payload.message.slice(0, 4000),
    stack: payload.stack?.slice(0, 8000) ?? null,
    componentStack: payload.componentStack?.slice(0, 8000) ?? null,
    userId: payload.userId ?? null,
    childId: payload.childId ?? null,
    meta: payload.meta ?? {},
    timestamp: ts,
  });
}

/** Upsert static regression registry into DB (idempotent). */
export async function syncCrashRegressionRegistry(): Promise<void> {
  for (const entry of CRASH_REGRESSION_REGISTRY) {
    const existing = await db
      .select({ id: crashRegressionsTable.id })
      .from(crashRegressionsTable)
      .where(
        eq(crashRegressionsTable.readableFingerprint, entry.readableFingerprint),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(crashRegressionsTable)
        .set({
          status: entry.status,
          rootCauseId: entry.rootCauseId ?? null,
          testPaths: entry.testPaths,
          updatedAt: new Date(),
        })
        .where(
          eq(
            crashRegressionsTable.readableFingerprint,
            entry.readableFingerprint,
          ),
        );
    } else {
      await db.insert(crashRegressionsTable).values({
        readableFingerprint: entry.readableFingerprint,
        status: entry.status,
        rootCauseId: entry.rootCauseId ?? null,
        testPaths: entry.testPaths,
      });
    }
  }
}

export async function safePersistCrashEvent(
  payload: CrashEventIngestPayload,
): Promise<void> {
  try {
    await persistCrashEvent(payload);
  } catch (err) {
    logger.warn({ err, errorId: payload.errorId }, "crash_event_persist_failed");
  }
}
