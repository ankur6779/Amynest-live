/**
 * Apply analytics migrations 0052 and 0053 on the API's own database session.
 * The Coolify Postgres host is not reachable from outside the Docker network.
 * This is the same shape as the 0050 ops migration: one secret-gated call,
 * no drizzle-kit push, no row deletes.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ANALYTICS_MIGRATION_LOCK_KEY = 520053;
export const ANALYTICS_MIGRATION_FILES = [
  "0052_analytics_product_spine.sql",
  "0053_analytics_event_id_partial_unique.sql",
] as const;

const SPINE_COLUMNS = [
  "event_id",
  "anonymous_device_id",
  "canonical_user_id",
  "firebase_uid",
  "page_name",
  "page_path",
  "previous_page",
  "referrer_page",
  "route_transition_id",
  "feature_name",
  "page_visit_id",
  "page_duration_ms",
  "interaction_type",
  "app_build",
  "os_version",
  "device_model",
  "webview_version",
  "install_source",
  "gclid",
  "gbraid",
  "wbraid",
  "campaign_id",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "attribution_status",
  "network_type",
  "event_schema_version",
  "ingestion_status",
] as const;

export type SqlClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

export type MigrationIndex = {
  indexname: string;
  indisunique: boolean;
  predicate: string | null;
};

export type MigrationColumn = {
  columnName: string;
  nullable: boolean;
};

export type AnalyticsMigrationResult = {
  status: 200 | 409 | 500;
  body: {
    ok: boolean;
    migration: "0052+0053";
    error?: string;
    precheck?: {
      eventIdColumnBefore: boolean;
      columnDuplicateGroups: number;
      propsDuplicateGroups: number;
    };
    indexes?: MigrationIndex[];
    columns?: MigrationColumn[];
  };
};

function candidateDirs(): string[] {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return [
    process.env.ANALYTICS_MIGRATION_DIR,
    "/app/migrations",
    path.resolve(here, "../../../../lib/db/migrations"),
    path.resolve(here, "../../../lib/db/migrations"),
  ].filter((dir): dir is string => Boolean(dir));
}

export function loadAnalyticsMigrationSql(name: (typeof ANALYTICS_MIGRATION_FILES)[number]): string {
  const tried: string[] = [];
  for (const dir of candidateDirs()) {
    const file = path.join(dir, name);
    tried.push(file);
    try {
      return readFileSync(file, "utf8");
    } catch {
      // try the next location
    }
  }
  throw new Error(`missing migration file ${name}; looked in ${tried.join(", ")}`);
}

export function columnEventIdPredicateOk(predicate: string | null | undefined): boolean {
  if (!predicate) return false;
  const upper = predicate.toUpperCase();
  return (
    !predicate.includes("props") &&
    predicate.includes("event_id") &&
    upper.includes("IS NOT NULL") &&
    predicate.includes("<>") &&
    !upper.includes(" OR ")
  );
}

export function propsEventIdPredicateOk(predicate: string | null | undefined): boolean {
  if (!predicate) return false;
  const upper = predicate.toUpperCase();
  return (
    predicate.includes("props") &&
    predicate.includes("event_id") &&
    upper.includes("IS NOT NULL") &&
    predicate.includes("<>") &&
    !upper.includes(" OR ")
  );
}

function num(row: Record<string, unknown>, key: string): number {
  const value = Number(row[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

async function readPrecheck(client: SqlClient): Promise<{
  eventIdColumnBefore: boolean;
  columnDuplicateGroups: number;
  propsDuplicateGroups: number;
}> {
  const column = await client.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'analytics_events'
         AND column_name = 'event_id'
     ) AS event_id_column`,
  );
  const eventIdColumnBefore = column.rows[0]?.event_id_column === true;
  const props = await client.query(
    `SELECT count(*)::int AS props_duplicate_groups
     FROM (
       SELECT props->>'event_id'
       FROM analytics_events
       WHERE coalesce(props->>'event_id', '') <> ''
       GROUP BY 1
       HAVING count(*) > 1
     ) d`,
  );
  let columnDuplicateGroups = 0;
  if (eventIdColumnBefore) {
    const dup = await client.query(
      `SELECT count(*)::int AS duplicate_groups
       FROM (
         SELECT event_id
         FROM analytics_events
         WHERE event_id IS NOT NULL AND event_id <> ''
         GROUP BY event_id
         HAVING count(*) > 1
       ) d`,
    );
    columnDuplicateGroups = num(dup.rows[0] ?? {}, "duplicate_groups");
  }
  return {
    eventIdColumnBefore,
    columnDuplicateGroups,
    propsDuplicateGroups: num(props.rows[0] ?? {}, "props_duplicate_groups"),
  };
}

async function readVerification(client: SqlClient): Promise<{
  indexes: MigrationIndex[];
  columns: MigrationColumn[];
}> {
  const indexes = await client.query(
    `SELECT c.relname AS indexname,
            i.indisunique,
            pg_get_expr(i.indpred, i.indrelid) AS predicate
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     JOIN pg_index i ON i.indexrelid = c.oid
     WHERE n.nspname = 'public'
       AND c.relname IN (
         'analytics_events_event_id_uq',
         'analytics_events_props_event_id_uq'
       )`,
  );
  const columns = await client.query(
    `SELECT column_name, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'analytics_events'
       AND column_name = ANY($1::text[])`,
    [SPINE_COLUMNS],
  );
  return {
    indexes: indexes.rows.map((row) => ({
      indexname: String(row.indexname ?? ""),
      indisunique: row.indisunique === true,
      predicate: row.predicate == null ? null : String(row.predicate),
    })),
    columns: columns.rows.map((row) => ({
      columnName: String(row.column_name ?? ""),
      nullable: String(row.is_nullable ?? "").toUpperCase() === "YES",
    })),
  };
}

function verificationOk(indexes: MigrationIndex[], columns: MigrationColumn[]): boolean {
  const columnIdx = indexes.find((row) => row.indexname === "analytics_events_event_id_uq");
  const propsIdx = indexes.find((row) => row.indexname === "analytics_events_props_event_id_uq");
  if (!columnIdx?.indisunique || !columnEventIdPredicateOk(columnIdx.predicate)) return false;
  if (!propsIdx?.indisunique || !propsEventIdPredicateOk(propsIdx.predicate)) return false;
  const present = new Set(columns.filter((col) => col.nullable).map((col) => col.columnName));
  return SPINE_COLUMNS.every((name) => present.has(name));
}

async function unlock(client: SqlClient): Promise<void> {
  await client.query(`SELECT pg_advisory_unlock($1::bigint)`, [ANALYTICS_MIGRATION_LOCK_KEY]);
}

export async function applyAnalyticsProductSpineMigration(
  client: SqlClient,
): Promise<AnalyticsMigrationResult> {
  const locked = await client.query(
    `SELECT pg_try_advisory_lock($1::bigint) AS locked`,
    [ANALYTICS_MIGRATION_LOCK_KEY],
  );
  if (locked.rows[0]?.locked !== true) {
    return {
      status: 409,
      body: { ok: false, migration: "0052+0053", error: "migration_in_progress" },
    };
  }

  let began = false;
  try {
    const precheck = await readPrecheck(client);
    if (precheck.columnDuplicateGroups > 0 || precheck.propsDuplicateGroups > 0) {
      return {
        status: 409,
        body: {
          ok: false,
          migration: "0052+0053",
          error: "duplicate_event_ids",
          precheck,
        },
      };
    }

    const sql0052 = loadAnalyticsMigrationSql("0052_analytics_product_spine.sql");
    const sql0053 = loadAnalyticsMigrationSql("0053_analytics_event_id_partial_unique.sql");
    await client.query("BEGIN");
    began = true;
    await client.query(sql0052);
    await client.query(sql0053);
    await client.query("COMMIT");
    began = false;

    const verified = await readVerification(client);
    if (!verificationOk(verified.indexes, verified.columns)) {
      return {
        status: 500,
        body: {
          ok: false,
          migration: "0052+0053",
          error: "verification_failed",
          precheck,
          indexes: verified.indexes,
          columns: verified.columns,
        },
      };
    }
    return {
      status: 200,
      body: {
        ok: true,
        migration: "0052+0053",
        precheck,
        indexes: verified.indexes,
        columns: verified.columns,
      },
    };
  } catch (err) {
    if (began) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // the session is already aborted
      }
    }
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: 500,
      body: { ok: false, migration: "0052+0053", error: message.slice(0, 300) },
    };
  } finally {
    try {
      await unlock(client);
    } catch {
      // connection is closing
    }
  }
}
