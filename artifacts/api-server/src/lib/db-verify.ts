import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Startup DB diagnostics — ping the DB, log latency, and verify that the tables
 * the cron/dispatch/auth code expects actually exist. Lets you spot a missed
 * migration before the first request hits a "relation does not exist" error.
 *
 * Designed to be SAFE: every step is wrapped in try/catch and returns a result
 * object. Callers decide whether to fail boot or continue degraded.
 */

/** Tables the API reads on hot paths (auth, dashboard, notifications, subscriptions). */
const CRITICAL_TABLES: readonly string[] = [
  "parent_profiles",
  "children",
  "routines",
  "subscriptions",
  "notification_preferences",
  "notification_log",
  "push_tokens",
];

export interface DbVerificationResult {
  pingOk: boolean;
  pingLatencyMs: number | null;
  pingError?: string;
  tables: Record<string, "present" | "missing" | "error">;
  missingTables: string[];
  durationMs: number;
}

export async function verifyDatabaseAtStartup(): Promise<DbVerificationResult> {
  const startedAt = Date.now();
  const result: DbVerificationResult = {
    pingOk: false,
    pingLatencyMs: null,
    tables: {},
    missingTables: [],
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
      const rs = await db.execute<{ exists: boolean }>(sql`
        SELECT to_regclass(${"public." + tableName}) IS NOT NULL AS exists
      `);
      const exists = rs.rows[0]?.exists === true;
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

  result.durationMs = Date.now() - startedAt;

  if (result.missingTables.length > 0) {
    logger.warn(
      {
        evt: "db.verify.missing_tables",
        missing: result.missingTables,
        present: Object.keys(result.tables).filter(
          (t) => result.tables[t] === "present",
        ),
        latencyMs: result.pingLatencyMs,
      },
      `DB verification: ${result.missingTables.length} critical table(s) missing — features depending on them will degrade`,
    );
  } else {
    logger.info(
      {
        evt: "db.verify.ok",
        tables: Object.keys(result.tables),
        latencyMs: result.pingLatencyMs,
        durationMs: result.durationMs,
      },
      "DB verification: ping OK, all critical tables present",
    );
  }

  return result;
}
