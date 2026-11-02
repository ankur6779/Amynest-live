import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function sql(name: string): string {
  return readFileSync(path.join(repoRoot, "lib/db/migrations", name), "utf8");
}

describe("analytics event_id unique index migrations", () => {
  it("does not use IF NOT EXISTS for the event id unique indexes", () => {
    for (const name of ["0052_analytics_product_spine.sql", "0053_analytics_event_id_partial_unique.sql"]) {
      const text = sql(name);
      assert.equal(text.includes("CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_event_id_uq"), false);
      assert.equal(text.includes("CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_props_event_id_uq"), false);
      assert.match(text, /RAISE EXCEPTION 'analytics_events_event_id_uq left unchanged/);
      assert.match(text, /DROP INDEX public\.analytics_events_event_id_uq/);
      assert.match(text, /WHERE event_id IS NOT NULL AND event_id <> ''/);
    }
  });

  it("declares the same partial predicate on the Drizzle schema", () => {
    const schema = readFileSync(
      path.join(repoRoot, "lib/db/src/schema/analytics_events.ts"),
      "utf8",
    );
    assert.match(schema, /analytics_events_event_id_uq/);
    assert.match(schema, /analytics_events_props_event_id_uq/);
    assert.match(schema, /\.where\(sql`\$\{t\.eventId\} IS NOT NULL AND \$\{t\.eventId\} <> ''`\)/);
  });

  it("requires the event_id column before the forward repair", () => {
    const repair = sql("0053_analytics_event_id_partial_unique.sql");
    assert.match(repair, /analytics_events\.event_id is missing/);
  });
});
