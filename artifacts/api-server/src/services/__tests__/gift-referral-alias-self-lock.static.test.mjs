import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../../../..");

function readRepoFile(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

/**
 * Sticky B→A identity aliases share one entitlement wallet. Anti-self checks that
 * compare raw Firebase uids allow B to redeem A's shareable gifts or attribute A's
 * referral code. Guardrails: canonicalize both sides via resolveSubscriptionOwnerUserId.
 */
describe("gift + referral sticky-alias self-lock", () => {
  it("redeemGiftToken rejects self-redeem via canonical subscription owners", () => {
    const src = readRepoFile("artifacts/api-server/src/services/giftTokenService.ts");

    assert.match(src, /resolveSubscriptionOwnerUserId/);
    assert.match(
      src,
      /resolveSubscriptionOwnerUserId\(token\.ownerUserId\)/,
      "must resolve gift owner to canonical wallet",
    );
    assert.match(
      src,
      /resolveSubscriptionOwnerUserId\(recipientUserId\)/,
      "must resolve recipient to canonical wallet",
    );
    assert.match(src, /ownerCanonical === recipientCanonical/);
    assert.doesNotMatch(
      src,
      /if \(token\.ownerUserId === recipientUserId\) return \{ ok: false, reason: "self_redeem" \}/,
      "raw Firebase uid equality must not be the sole self_redeem gate",
    );
  });

  it("attributeReferral rejects self-referral via canonical subscription owners", () => {
    const src = readRepoFile("artifacts/api-server/src/services/referralService.ts");

    assert.match(src, /resolveSubscriptionOwnerUserId/);
    assert.match(
      src,
      /resolveSubscriptionOwnerUserId\(referrer\.userId\)/,
      "must resolve referrer to canonical wallet",
    );
    assert.match(
      src,
      /resolveSubscriptionOwnerUserId\(referredUserId\)/,
      "must resolve referred user to canonical wallet",
    );
    assert.match(src, /referrerCanonical === referredCanonical/);
    assert.doesNotMatch(
      src,
      /if \(referrer\.userId === referredUserId\) return \{ ok: false, reason: "self_referral" \}/,
      "raw Firebase uid equality must not be the sole self_referral gate",
    );
  });
});
