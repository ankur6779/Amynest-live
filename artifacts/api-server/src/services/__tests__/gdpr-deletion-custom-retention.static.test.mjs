/**
 * Static source assertions — always run (no Postgres required).
 * Complements open PR #138 (Birth Sky / Health Lab / Speech V2 / nutrition):
 * these tables were still omitted from purge on main.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const __dir = dirname(fileURLToPath(import.meta.url));
const deletionSource = readFileSync(
  join(__dir, "../data-deletion-service.ts"),
  "utf8",
);

test("purgeChildScopedData deletes worksheet downloads and custom activities", () => {
  assert.match(deletionSource, /userCustomActivitiesTable/);
  assert.match(deletionSource, /worksheetDownloadsTable/);
  assert.match(deletionSource, /table: "worksheet_downloads"/);
  assert.match(deletionSource, /table: "user_custom_activities"/);
  assert.match(
    deletionSource,
    /eq\(userCustomActivitiesTable\.childId, childId\)/,
  );
  assert.match(
    deletionSource,
    /eq\(worksheetDownloadsTable\.childId, childId\)/,
  );
});

test("purgeUserScopedData deletes user_retention and user-scoped leftovers", () => {
  assert.match(deletionSource, /userRetentionTable/);
  assert.match(deletionSource, /table: "user_retention"/);
  assert.match(
    deletionSource,
    /eq\(userRetentionTable\.userId, userId\)/,
  );
  assert.match(
    deletionSource,
    /table: "user_custom_activities_by_user"/,
  );
  assert.match(
    deletionSource,
    /table: "worksheet_downloads_by_user"/,
  );
});
