import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isAdminUser } from "./admin-auth.js";

const __dir = dirname(fileURLToPath(import.meta.url));

const ADMIN_ROUTE_FILES = [
  "user-feedback.ts",
  "chat-platform-health.ts",
  "stories.ts",
  "static-audio.ts",
  "startup-telemetry.ts",
  "startup-funnel.ts",
  "birth-sky-ops-admin.ts",
  "audio-health.ts",
  "speech-coach-v2-cost-admin.ts",
  "analytics-admin.ts",
  "ai-coach.ts",
  "crash-intelligence.ts",
  "notifications.ts",
  "notification-prefs.ts",
  "infant-analytics-admin.ts",
  "health-lab.ts",
] as const;

function readRoute(name: string): string {
  return readFileSync(join(__dir, "../routes", name), "utf8");
}

describe("admin-auth", () => {
  it("returns false without user id", () => {
    assert.equal(isAdminUser(null), false);
    assert.equal(isAdminUser(undefined), false);
  });

  it("matches ADMIN_USER_IDS", () => {
    const prev = process.env.ADMIN_USER_IDS;
    process.env.ADMIN_USER_IDS = "uid-a, uid-b";
    assert.equal(isAdminUser("uid-a"), true);
    assert.equal(isAdminUser("uid-c"), false);
    process.env.ADMIN_USER_IDS = prev;
  });

  it("admin route files use centralized requireAdmin instead of local isAdminUser", () => {
    for (const file of ADMIN_ROUTE_FILES) {
      const src = readRoute(file);
      assert.doesNotMatch(
        src,
        /function isAdminUser/,
        `${file} should not define a local isAdminUser helper`,
      );
      assert.match(
        src,
        /requireAdmin/,
        `${file} should import or use requireAdmin from admin-auth`,
      );
      assert.match(
        src,
        /admin-auth/,
        `${file} should reference centralized admin-auth module`,
      );
    }
  });
});
