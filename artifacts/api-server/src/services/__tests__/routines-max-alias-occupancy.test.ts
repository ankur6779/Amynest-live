import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("routinesMax sticky-alias occupancy", () => {
  it("lists all firebase uids for a sticky subscription identity", () => {
    const src = readRepoFile(
      "artifacts/api-server/src/services/userIdentityService.ts",
    );
    assert.match(src, /export async function listUserIdsForSubscriptionIdentity/);
    assert.match(src, /resolveSubscriptionOwnerUserId\(firebaseUid/);
    assert.match(
      src,
      /eq\(userIdentityAliasesTable\.internalUserId, ownerUserId\)/,
    );
  });

  it("free routinesMax counts across sticky-alias identity on generate and save", () => {
    const src = readRepoFile("artifacts/api-server/src/routes/routines.ts");
    assert.match(src, /listUserIdsForSubscriptionIdentity/);

    const limitFn = src.slice(
      src.indexOf("async function isOverFreeRoutineLimit"),
      src.indexOf("return (n ?? 0) >= FREE_LIMITS.routinesMax;") +
        "return (n ?? 0) >= FREE_LIMITS.routinesMax;".length,
    );
    assert.match(limitFn, /listUserIdsForSubscriptionIdentity\(userId\)/);
    assert.match(limitFn, /inArray\(childrenTable\.userId, identityUserIds\)/);
    assert.doesNotMatch(limitFn, /eq\(childrenTable\.userId, userId\)/);

    const saveIdx = src.indexOf('router.post("/routines"');
    const saveBlock = src.slice(
      saveIdx,
      src.indexOf('error: "routine_limit_reached"', saveIdx) + 200,
    );
    assert.match(saveBlock, /listUserIdsForSubscriptionIdentity\(userId\)/);
    assert.match(saveBlock, /inArray\(childrenTable\.userId, identityUserIds\)/);
  });
});
