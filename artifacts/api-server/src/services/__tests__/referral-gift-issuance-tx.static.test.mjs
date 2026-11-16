/**
 * Static source regression: paid referral milestones must mint gift tokens
 * inside the same DB transaction that bumps referralRewardsGranted.
 *
 * Previously the counter committed first, then createGiftToken ran after
 * commit. A mint failure / process crash permanently burned the milestone
 * (retries see toGrant <= 0), and activateSubscription swallows the error.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const referralService = readFileSync(join(here, "../referralService.ts"), "utf8");
const giftTokenService = readFileSync(join(here, "../giftTokenService.ts"), "utf8");

describe("referral paid gift issuance transaction (static)", () => {
  it("tryGrantReferralReward mints gifts inside the counter-bump transaction", () => {
    const start = referralService.indexOf("export async function tryGrantReferralReward");
    assert.ok(start >= 0, "tryGrantReferralReward missing");
    const end = referralService.indexOf("export async function getReferralStats", start);
    const body = referralService.slice(start, end > start ? end : undefined);

    const txStart = body.indexOf("db.transaction");
    assert.ok(txStart >= 0, "must use db.transaction");
    const afterTx = body.slice(txStart);
    // createGiftToken must appear inside the transaction callback, not only after it.
    assert.match(
      afterTx,
      /transaction\([\s\S]*createGiftToken\(\s*referrerUserId\s*,\s*REFERRAL_REWARD_DAYS\s*,\s*tx\s*\)/,
      "createGiftToken must run with tx inside the transaction",
    );
    assert.doesNotMatch(
      body,
      /if\s*\(\s*granted\s*>\s*0\s*&&\s*isPaid\s*\)\s*\{[\s\S]*createGiftToken/,
      "must not mint gifts after the transaction commits",
    );
  });

  it("createGiftToken accepts a dbExec/tx parameter for transactional callers", () => {
    assert.match(
      giftTokenService,
      /export async function createGiftToken\(\s*ownerUserId:\s*string,\s*bonusDays\s*=\s*30,\s*dbExec:\s*DbExec\s*=\s*db,/,
    );
    assert.match(giftTokenService, /await dbExec\s*\n?\s*\.insert\(giftTokensTable\)/);
  });

  it("redeemGiftToken marks redeemed and extends bonus in one transaction", () => {
    const start = giftTokenService.indexOf("export async function redeemGiftToken");
    assert.ok(start >= 0, "redeemGiftToken missing");
    const end = giftTokenService.indexOf("export async function listGiftTokens", start);
    const body = giftTokenService.slice(start, end > start ? end : undefined);

    assert.match(body, /db\.transaction/);
    assert.match(
      body,
      /transaction\([\s\S]*status:\s*"redeemed"[\s\S]*extendBonusPremium\(\s*recipientUserId\s*,\s*bonusDays\s*,\s*tx\s*\)/,
      "redeem mark and extendBonusPremium must share one transaction",
    );
    assert.doesNotMatch(
      body,
      /returning\(\{ id: giftTokensTable\.id, bonusDays: giftTokensTable\.bonusDays \}\);\s*\n\s*if \(updated\.length === 0\) return \{ ok: false, reason: "already_redeemed" \};\s*\n\s*const bonusDays = updated\[0\]\.bonusDays;\s*\n\s*try \{\s*\n\s*await extendBonusPremium\(recipientUserId, bonusDays\);/,
      "must not mark redeemed then grant outside a transaction",
    );
  });
});
