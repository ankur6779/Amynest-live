import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("subscription identity occupancy (sticky alias)", () => {
  it("lists all firebase uids for a sticky subscription owner", () => {
    const src = readRepoFile("artifacts/api-server/src/services/userIdentityService.ts");
    assert.match(src, /export async function listUserIdsForSubscriptionIdentity/);
    assert.match(src, /resolveSubscriptionOwnerUserId\(firebaseUid/);
    assert.match(src, /eq\(userIdentityAliasesTable\.internalUserId, ownerUserId\)/);
  });

  it("POST /children counts children across the sticky-alias identity", () => {
    const src = readRepoFile("artifacts/api-server/src/routes/children.ts");
    assert.match(src, /listUserIdsForSubscriptionIdentity\(userId\)/);
    assert.match(src, /inArray\(childrenTable\.userId, identityUserIds\)/);
    assert.doesNotMatch(
      src.slice(src.indexOf("Enforce child limit"), src.indexOf("catch (err)")),
      /eq\(childrenTable\.userId, userId\)/,
    );
  });

  it("device registration counts and replaces across sticky-alias identity", () => {
    const src = readRepoFile("artifacts/api-server/src/services/deviceLimitService.ts");
    assert.match(src, /listUserIdsForSubscriptionIdentity/);
    assert.match(src, /resolveSubscriptionOwnerUserId\(userId, tx\)/);

    const countFn = src.slice(
      src.indexOf("export async function countActiveDevices"),
      src.indexOf("async function listActiveDeviceRowsForIdentity"),
    );
    assert.match(countFn, /inArray\(userDevicesTable\.userId, identityUserIds\)/);

    const register = src.slice(
      src.indexOf("export async function registerOrRefreshDevice"),
      src.indexOf("export async function deactivateDevice"),
    );
    assert.match(register, /advisoryLockUser\(tx, ownerUserId\)/);
    assert.match(register, /deactivateOldestActiveExcept\(tx, identityUserIds, deviceId\)/);
    assert.match(register, /listActiveDeviceRowsForIdentity/);
  });
});
