/**
 * Static regression guard: GDPR purge must cover high-PII tables.
 * Plain ESM — no tsx / DB required.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const deletionSource = readFileSync(
  join(here, "../data-deletion-service.ts"),
  "utf8",
);

const REQUIRED_CHILD_TABLES = [
  "birth_profiles",
  "sky_snapshots",
  "birth_sky_messages",
  "health_lab_progress",
  "speech_coach_v2_turn_log",
  "speech_coach_v2_sessions",
  "nutrition_daily_log",
  "nutrition_meal_memory",
];

const REQUIRED_USER_TABLES = [
  "birth_sky_preferences",
  "user_devices",
  "user_identity_aliases",
  "nutrition_caregiver_share",
];

test("purgeChildScopedData source lists Birth Sky, Health Lab, Speech V2, nutrition", () => {
  assert.match(deletionSource, /purgeBirthSkyChildData/);
  for (const table of REQUIRED_CHILD_TABLES) {
    assert.match(
      deletionSource,
      new RegExp(`table:\\s*"${table}"`),
      `missing child purge for ${table}`,
    );
  }
});

test("purgeUserScopedData source lists Birth Sky prefs, devices, identity aliases", () => {
  assert.match(deletionSource, /purgeBirthSkyUserData/);
  for (const table of REQUIRED_USER_TABLES) {
    assert.match(
      deletionSource,
      new RegExp(`table:\\s*"${table}"`),
      `missing user purge for ${table}`,
    );
  }
});
