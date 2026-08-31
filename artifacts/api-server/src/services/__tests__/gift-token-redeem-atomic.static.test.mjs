/**
 * Static source assertions — gift redeem must not burn the token when
 * extendBonusPremium fails (mark + grant in one transaction).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const __dir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dir, "../giftTokenService.ts"), "utf8");

test("redeemGiftToken wraps mark-redeemed and extendBonusPremium in one transaction", () => {
  const redeemIdx = source.indexOf("export async function redeemGiftToken");
  assert.ok(redeemIdx >= 0);
  const body = source.slice(redeemIdx, redeemIdx + 2200);
  assert.match(body, /db\.transaction\s*\(/);
  assert.match(body, /extendBonusPremium\s*\(\s*recipientUserId\s*,\s*bonusDays\s*,\s*tx\s*\)/);
  assert.match(body, /status:\s*"redeemed"/);
  // Failure path must not leave a committed redeemed row outside the TX.
  assert.doesNotMatch(
    body,
    /await db\s*\n\s*\.update\(giftTokensTable\)[\s\S]*extendBonusPremium/,
  );
});
