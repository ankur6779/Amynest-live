import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Startup DB diagnostics — ping the DB, log latency, and verify that tables
 * and onboarding-critical columns exist. Runs on every boot so schema drift is
 * visible before the first onboarding save hits a "relation does not exist".
 */

/** Tables the onboarding save flow reads/writes. */
export const ONBOARDING_CRITICAL_TABLES: readonly string[] = [
  "children",
  "parent_profiles",
  "subscriptions",
  "push_tokens",
  "onboarding_profiles",
];

/** Tables the API reads on hot paths (auth, dashboard, notifications). */
const CRITICAL_TABLES: readonly string[] = [
  "parent_profiles",
  "children",
  "routines",
  "subscriptions",
  "notification_preferences",
  "notification_log",
  "feature_notification_schedules",
  "push_tokens",
  "onboarding_profiles",
  "razorpay_webhook_events",
  "health_lab_progress",
  "user_devices",
];

/** Columns that commonly drift and crash onboarding if missing. */
const CRITICAL_COLUMNS: ReadonlyArray<{ table: string; column: string }> = [
  { table: "children", column: "fixed_activities" },
  { table: "children", column: "parent_goals" },
  { table: "parent_profiles", column: "food_style" },
  { table: "parent_profiles", column: "free_slots" },
  { table: "subscriptions", column: "bonus_expires_at" },
  { table: "push_tokens", column: "last_seen_at" },
  { table: "user_devices", column: "browser" },
  { table: "user_devices", column: "last_ip_hash" },
];

export interface DbVerificationResult {
  pingOk: boolean;
  pingLatencyMs: number | null;
  pingError?: string;
  tables: Record<string, "present" | "missing" | "error">;
  missingTables: string[];
  columns: Record<string, "present" | "missing" | "error">;
  missingColumns: string[];
  notificationDedupIndexPresent: boolean;
  notificationProviderMessageIdPresent: boolean;
  notificationUserSentIdxPresent: boolean;
  durationMs: number;
}

function columnKey(table: string, column: string): string {
  return `${table}.${column}`;
}

async function tableExists(tableName: string): Promise<boolean> {
  const rs = await db.execute<{ exists: boolean }>(sql`
    SELECT to_regclass(${`public.${tableName}`}) IS NOT NULL AS exists
  `);
  return rs.rows[0]?.exists === true;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const rs = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND column_name = ${columnName}
    ) AS exists
  `);
  return rs.rows[0]?.exists === true;
}

export async function verifyDatabaseAtStartup(): Promise<DbVerificationResult> {
  const startedAt = Date.now();
  const result: DbVerificationResult = {
    pingOk: false,
    pingLatencyMs: null,
    tables: {},
    missingTables: [],
    columns: {},
    missingColumns: [],
    notificationDedupIndexPresent: false,
    notificationProviderMessageIdPresent: false,
    notificationUserSentIdxPresent: false,
    durationMs: 0,
  };

  const pingStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    result.pingOk = true;
    result.pingLatencyMs = Date.now() - pingStart;
  } catch (err) {
    result.pingError = err instanceof Error ? err.message : String(err);
    result.pingLatencyMs = Date.now() - pingStart;
    logger.error(
      { evt: "db.verify.ping_failed", err, latencyMs: result.pingLatencyMs },
      "DB ping failed at startup",
    );
    result.durationMs = Date.now() - startedAt;
    return result;
  }

  for (const tableName of CRITICAL_TABLES) {
    try {
      const exists = await tableExists(tableName);
      result.tables[tableName] = exists ? "present" : "missing";
      if (!exists) result.missingTables.push(tableName);
    } catch (err) {
      result.tables[tableName] = "error";
      logger.warn(
        { evt: "db.verify.table_error", table: tableName, err },
        `Could not verify table ${tableName}`,
      );
    }
  }

  for (const { table, column } of CRITICAL_COLUMNS) {
    const key = columnKey(table, column);
    try {
      if (result.tables[table] === "missing") {
        result.columns[key] = "missing";
        result.missingColumns.push(key);
        continue;
      }
      const exists = await columnExists(table, column);
      result.columns[key] = exists ? "present" : "missing";
      if (!exists) result.missingColumns.push(key);
    } catch (err) {
      result.columns[key] = "error";
      logger.warn(
        { evt: "db.verify.column_error", table, column, err },
        `Could not verify column ${key}`,
      );
    }
  }

  result.durationMs = Date.now() - startedAt;

  try {
    const { notificationDedupIndexExists } = await import(
      "../services/notificationClaimService.js"
    );
    result.notificationDedupIndexPresent = await notificationDedupIndexExists();
    if (!result.notificationDedupIndexPresent) {
      logger.error(
        { evt: "db.verify.dedup_index_missing" },
        "CRITICAL: notification_log_user_dedup_unique index is missing",
      );
    }

    result.notificationProviderMessageIdPresent = await columnExists(
      "notification_log",
      "provider_message_id",
    );
    if (!result.notificationProviderMessageIdPresent) {
      logger.error(
        { evt: "db.verify.provider_message_id_missing" },
        "CRITICAL: notification_log.provider_message_id column is missing",
      );
    }

    const idxRs = await db.execute<{ exists: boolean }>(sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'notification_log_user_sent_idx'
      ) AS exists
    `);
    result.notificationUserSentIdxPresent = idxRs.rows[0]?.exists === true;
    if (!result.notificationUserSentIdxPresent) {
      logger.warn(
        { evt: "db.verify.notification_sent_idx_missing" },
        "notification_log_user_sent_idx missing — rate-limit queries may be slow",
      );
    }
  } catch (err) {
    logger.error({ err, evt: "db.verify.dedup_index_check_failed" }, "Could not verify dedup index");
  }

  const onboardingMissing = ONBOARDING_CRITICAL_TABLES.filter(
    (t) => result.tables[t] === "missing",
  );

  if (result.missingTables.length > 0 || result.missingColumns.length > 0) {
    logger.warn(
      {
        evt: "db.verify.schema_gaps",
        missingTables: result.missingTables,
        missingColumns: result.missingColumns,
        onboardingMissing,
        presentTables: Object.keys(result.tables).filter((t) => result.tables[t] === "present"),
        latencyMs: result.pingLatencyMs,
        durationMs: result.durationMs,
      },
      `DB schema gaps: ${result.missingTables.length} missing table(s), ${result.missingColumns.length} missing column(s) — onboarding APIs will use fallbacks where needed`,
    );
  } else {
    logger.info(
      {
        evt: "db.verify.ok",
        tables: Object.keys(result.tables),
        columns: Object.keys(result.columns),
        latencyMs: result.pingLatencyMs,
        durationMs: result.durationMs,
      },
      "DB verification: ping OK, all critical tables and columns present",
    );
  }

  return result;
}

/** Fail fast when notification dedup index is missing — unsafe to deliver pushes. */
export async function assertNotificationDedupIndexAtStartup(): Promise<void> {
  const { assertNotificationDedupIndex, NotificationDedupIndexMissingError } = await import(
    "../services/notificationClaimService.js"
  );
  try {
    await assertNotificationDedupIndex();
  } catch (err) {
    if (err instanceof NotificationDedupIndexMissingError) {
      throw err;
    }
    throw new NotificationDedupIndexMissingError();
  }
}
