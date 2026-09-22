/**
 * Regression: GDPR account purge must delete anonymous_devices (linkedUserId)
 * and notification_journey_enrollments (userId) — beyond Birth Sky / worksheet sets.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "data-deletion-service.ts"), "utf8");

test("purgeUserScopedData deletes anonymous_devices by linkedUserId", () => {
  assert.match(source, /anonymousDevicesTable/);
  assert.match(
    source,
    /table: "anonymous_devices".*anonymousDevicesTable\.linkedUserId/s,
  );
});

test("purgeUserScopedData deletes notification_journey_enrollments by userId", () => {
  assert.match(source, /notificationJourneyEnrollmentsTable/);
  assert.match(
    source,
    /table: "notification_journey_enrollments".*notificationJourneyEnrollmentsTable\.userId/s,
  );
});
