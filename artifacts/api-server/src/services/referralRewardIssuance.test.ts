/**
 * Regression: paid referral milestones must mint gift tokens inside the same
 * transaction as the referralRewardsGranted bump — otherwise createGiftToken
 * failure permanently burns the reward (toGrant <= 0 on retry).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

test("tryGrantReferralReward creates gift tokens inside the counter transaction", () => {
  const source = readFileSync(join(here, "referralService.ts"), "utf8");
  const fnStart = source.indexOf("export async function tryGrantReferralReward");
  assert.ok(fnStart >= 0);
  const nextExport = source.indexOf("\nexport async function", fnStart + 1);
  const body = source.slice(fnStart, nextExport > 0 ? nextExport : undefined);

  assert.match(body, /await createGiftToken\(referrerUserId, REFERRAL_REWARD_DAYS, tx\)/);
  assert.doesNotMatch(
    body,
    /if \(granted > 0 && isPaid\)/,
    "must not mint gifts after the transaction using the post-commit granted count",
  );
});

test("createGiftToken accepts an optional transaction executor", () => {
  const source = readFileSync(join(here, "giftTokenService.ts"), "utf8");
  assert.match(
    source,
    /export async function createGiftToken\(\s*ownerUserId: string,\s*bonusDays = 30,\s*exec: DbExecutor = db,/,
  );
});
