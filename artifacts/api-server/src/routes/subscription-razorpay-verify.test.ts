import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldPersistRazorpayVerifyProviderLinkage } from "../lib/razorpay-verify-linkage.js";

/**
 * Regression: after migration 0043, FREE rows must keep provider=none and
 * provider_subscription_id NULL. Verify used to UPDATE those fields while
 * leaving subscriptionState=FREE → Postgres CHECK 500 → client aborts poll.
 */
describe("shouldPersistRazorpayVerifyProviderLinkage", () => {
  it("skips intent linkage for FREE (never-trialed / infant cohort)", () => {
    assert.equal(shouldPersistRazorpayVerifyProviderLinkage("FREE"), false);
  });

  it("allows intent linkage on non-FREE shapes that satisfy free_provider_link_chk", () => {
    for (const state of ["TRIAL", "ACTIVE", "EXPIRED", "CANCELLED", "GRACE_PERIOD", "PAUSED"]) {
      assert.equal(
        shouldPersistRazorpayVerifyProviderLinkage(state),
        true,
        `expected persist for ${state}`,
      );
    }
  });

  it("treats missing state conservatively as persistable (getOrCreate always sets state)", () => {
    assert.equal(shouldPersistRazorpayVerifyProviderLinkage(null), true);
    assert.equal(shouldPersistRazorpayVerifyProviderLinkage(undefined), true);
  });
});
