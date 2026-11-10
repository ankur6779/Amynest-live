import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAnalyticsProductSpineMigration,
  columnEventIdPredicateOk,
  propsEventIdPredicateOk,
  type SqlClient,
} from "./analyticsProductSpineMigration.js";

const COLUMN_PREDICATE = "(event_id IS NOT NULL AND event_id <> '')";
const PROPS_PREDICATE = "((props ->> 'event_id') IS NOT NULL AND (props ->> 'event_id') <> '')";
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
];

function client(opts: {
  locked?: boolean;
  eventIdColumn?: boolean;
  columnDuplicates?: number;
  propsDuplicates?: number;
  failOn?: string;
}): { sql: SqlClient; calls: string[] } {
  const calls: string[] = [];
  const sql: SqlClient = {
    async query(text) {
      calls.push(text);
      if (text.includes("pg_try_advisory_lock")) {
        return { rows: [{ locked: opts.locked !== false }] };
      }
      if (text.includes("pg_advisory_unlock")) return { rows: [] };
      if (text.includes("AS event_id_column")) {
        return { rows: [{ event_id_column: opts.eventIdColumn === true }] };
      }
      if (text.includes("props_duplicate_groups")) {
        return { rows: [{ props_duplicate_groups: opts.propsDuplicates ?? 0 }] };
      }
      if (text.includes("AS duplicate_groups")) {
        return { rows: [{ duplicate_groups: opts.columnDuplicates ?? 0 }] };
      }
      if (opts.failOn && text.includes(opts.failOn)) {
        throw new Error("duplicate non-empty event_id groups");
      }
      if (text.includes("pg_get_expr")) {
        return {
          rows: [
            {
              indexname: "analytics_events_event_id_uq",
              indisunique: true,
              predicate: COLUMN_PREDICATE,
            },
            {
              indexname: "analytics_events_props_event_id_uq",
              indisunique: true,
              predicate: PROPS_PREDICATE,
            },
          ],
        };
      }
      if (text.includes("is_nullable")) {
        return {
          rows: SPINE_COLUMNS.map((column_name) => ({ column_name, is_nullable: "YES" })),
        };
      }
      return { rows: [] };
    },
  };
  return { sql, calls };
}

describe("analytics product spine migration", () => {
  it("accepts only the partial event id predicates", () => {
    assert.equal(columnEventIdPredicateOk(COLUMN_PREDICATE), true);
    assert.equal(columnEventIdPredicateOk(null), false);
    assert.equal(columnEventIdPredicateOk("event_id IS NOT NULL OR event_id <> ''"), false);
    assert.equal(propsEventIdPredicateOk(PROPS_PREDICATE), true);
    assert.equal(propsEventIdPredicateOk(COLUMN_PREDICATE), false);
  });

  it("stops before any DDL when duplicate event ids exist", async () => {
    const { sql, calls } = client({ eventIdColumn: true, columnDuplicates: 2 });
    const result = await applyAnalyticsProductSpineMigration(sql);
    assert.equal(result.status, 409);
    assert.equal(result.body.error, "duplicate_event_ids");
    assert.equal(calls.some((text) => text === "BEGIN"), false);
    assert.equal(calls.some((text) => text.includes("CREATE UNIQUE INDEX")), false);
    assert.equal(calls.some((text) => text.includes("pg_advisory_unlock")), true);
  });

  it("stops before any DDL when duplicate props event ids exist", async () => {
    const { sql, calls } = client({ eventIdColumn: false, propsDuplicates: 1 });
    const result = await applyAnalyticsProductSpineMigration(sql);
    assert.equal(result.status, 409);
    assert.equal(result.body.precheck?.propsDuplicateGroups, 1);
    assert.equal(calls.some((text) => text === "BEGIN"), false);
  });

  it("applies 0052 then 0053 in one transaction when duplicate groups are zero", async () => {
    const { sql, calls } = client({ eventIdColumn: false });
    const result = await applyAnalyticsProductSpineMigration(sql);
    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    const begin = calls.indexOf("BEGIN");
    const file0052 = calls.findIndex((text) => text.includes("Additive product-analytics spine"));
    const file0053 = calls.findIndex((text) => text.includes("Forward repair for analytics event_id"));
    const commit = calls.indexOf("COMMIT");
    assert.ok(begin >= 0 && file0052 > begin && file0053 > file0052 && commit > file0053);
    assert.equal(result.body.indexes?.length, 2);
    assert.equal(result.body.columns?.length, SPINE_COLUMNS.length);
  });

  it("rolls back when the migration statement fails", async () => {
    const { sql, calls } = client({ eventIdColumn: false, failOn: "Additive product-analytics spine" });
    const result = await applyAnalyticsProductSpineMigration(sql);
    assert.equal(result.status, 500);
    assert.match(result.body.error ?? "", /duplicate non-empty event_id/);
    assert.equal(calls.includes("ROLLBACK"), true);
    assert.equal(calls.includes("COMMIT"), false);
  });

  it("does not start a second migration while the lock is held", async () => {
    const { sql, calls } = client({ locked: false });
    const result = await applyAnalyticsProductSpineMigration(sql);
    assert.equal(result.status, 409);
    assert.equal(result.body.error, "migration_in_progress");
    assert.equal(calls.some((text) => text.includes("analytics_events")), false);
  });
});
