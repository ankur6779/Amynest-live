import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("premium identity certification guardrails", () => {
  it("A/B/F/G/J: recovery requires verified email, exact normalization, advisory lock, and unique UID alias", () => {
    const service = readRepoFile("artifacts/api-server/src/services/userIdentityService.ts");
    const schema = readRepoFile("lib/db/src/schema/user_identity_aliases.ts");

    assert.match(service, /auth\.emailVerified === true/);
    assert.match(service, /email\?\.trim\(\)\.toLowerCase\(\)/);
    assert.match(service, /pg_advisory_xact_lock\(hashtext\(\$\{normalizedEmail\}\)\)/);
    assert.match(service, /findPremiumOwnerByVerifiedEmail/);
    assert.match(service, /findPremiumOwnerByFirebaseEmailLookup/);
    assert.match(schema, /uniqueIndex\("user_identity_aliases_firebase_uid_uq"\)\.on\(t\.firebaseUid\)/);
  });

  it("C/H: RevenueCat webhook canonicalizes app_user_id before sync or fallback entitlement writes", () => {
    const route = readRepoFile("artifacts/api-server/src/routes/subscription.ts");
    const rawIdx = route.indexOf("const rawRevenueCatUserId = preferredRevenueCatUserId");
    const canonicalIdx = route.indexOf("const userId = await resolveSubscriptionOwnerUserId(rawRevenueCatUserId)");
    const syncIdx = route.indexOf("syncRevenueCatSubscription(userId");
    const fallbackIdx = route.indexOf("applyRevenueCatSnapshot(userId");

    assert.ok(rawIdx >= 0, "webhook should capture raw RevenueCat app user id");
    assert.ok(canonicalIdx > rawIdx, "webhook should resolve canonical owner after raw id capture");
    assert.ok(syncIdx > canonicalIdx, "webhook sync should use canonical owner");
    assert.ok(fallbackIdx > canonicalIdx, "webhook fallback apply should use canonical owner");
    assert.doesNotMatch(route, /syncRevenueCatSubscription\(rawRevenueCatUserId/);
    assert.doesNotMatch(route, /applyRevenueCatSnapshot\(rawRevenueCatUserId/);
  });

  it("C/H: RevenueCat webhook retries failed events instead of dead-lettering on duplicate delivery", () => {
    const route = readRepoFile("artifacts/api-server/src/routes/subscription.ts");
    assert.match(route, /processingStatus !== "failed"/);
    assert.match(route, /eventName: "webhook_retry"/);
  });

  it("D/E/I: native billing never configures, purchases, or restores with raw Firebase uid fallback", () => {
    const hook = readRepoFile("artifacts/kidschedule/src/hooks/use-native-billing.ts");

    assert.match(hook, /requireRevenueCatAppUserId/);
    assert.match(hook, /Loading your billing account/);
    assert.doesNotMatch(hook, /initIOSBilling\(revenueCatAppUserId \?\? user\.id\)/);
    assert.doesNotMatch(hook, /const appUserId = revenueCatAppUserId \?\? user/);
    assert.doesNotMatch(hook, /androidBridge\.setUserId\(user\.id\)/);
  });

  it("legacy premium alias backfill is idempotent and dry-run capable", () => {
    const script = readRepoFile("artifacts/api-server/scripts/backfill-premium-identity-aliases.ts");

    assert.match(script, /dryRun = process\.argv\.includes\("--dry-run"\) \|\| !write/);
    assert.match(script, /isPremiumNow\(sub\)/);
    assert.match(script, /adminAuth\(\)\.getUser\(sub\.userId\)/);
    assert.match(script, /user\.emailVerified !== true/);
    assert.match(script, /onConflictDoNothing/);
    assert.match(script, /scannedSubscriptions/);
    assert.match(script, /aliasesCreated/);
    assert.match(script, /aliasesSkipped/);
    assert.match(script, /failures/);
  });
});
