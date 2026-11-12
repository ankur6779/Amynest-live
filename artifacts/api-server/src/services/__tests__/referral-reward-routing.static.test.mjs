/**
 * Static source regression: tryGrantReferralReward must route gift vs bonus
 * via isPremiumSubscriberNow (paid providers only), not isPremiumNow (includes
 * bonusExpiresAt). Bonus-only referrers previously received self-owned gifts
 * that self_redeem permanently blocks.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const referralService = readFileSync(join(here, "../referralService.ts"), "utf8");
const premiumGate = readFileSync(join(here, "../subscription-premium-gate.ts"), "utf8");

describe("referral reward gift vs bonus routing (static)", () => {
  it("tryGrantReferralReward uses isPremiumSubscriberNow for gift routing", () => {
    const start = referralService.indexOf("export async function tryGrantReferralReward");
    assert.ok(start >= 0, "tryGrantReferralReward missing");
    const end = referralService.indexOf("export async function getReferralStats", start);
    const body = referralService.slice(start, end > start ? end : undefined);

    assert.match(body, /isPremiumSubscriberNow\s*\(\s*sub\s*\)/);
    assert.doesNotMatch(body, /\bisPaid\s*=\s*isPremiumNow\s*\(\s*sub\s*\)/);
    assert.match(body, /createGiftToken/);
    assert.match(body, /extendBonusPremium/);
  });

  it("isPremiumSubscriberNow rejects bonus-only / non-paid providers", () => {
    assert.match(premiumGate, /export function isPremiumSubscriberNow/);
    assert.match(
      premiumGate,
      /\["razorpay",\s*"revenuecat",\s*"stripe"\]\.includes\(s\.provider/,
    );
    assert.match(premiumGate, /subscriptionState === "TRIAL"/);
    assert.match(premiumGate, /subscriptionState === "GRACE_PERIOD"/);
  });

  it("isPremiumNow still treats bonusExpiresAt as premium", () => {
    assert.match(premiumGate, /export function isPremiumNow/);
    assert.match(premiumGate, /bonusExpiresAt/);
  });
});
