import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldApplyRazorpayTerminalEvent } from "../razorpay-webhook-guards.js";

describe("shouldApplyRazorpayTerminalEvent", () => {
  it("ignores terminal events when local provider is RevenueCat", () => {
    const result = shouldApplyRazorpayTerminalEvent(
      { provider: "revenuecat", providerSubscriptionId: "rc_txn" },
      "sub_abandoned",
    );
    assert.deepEqual(result, { apply: false, reason: "provider_is_revenuecat" });
  });

  it("ignores terminal events when local provider is manual", () => {
    const result = shouldApplyRazorpayTerminalEvent(
      { provider: "manual", providerSubscriptionId: null },
      "sub_abandoned",
    );
    assert.deepEqual(result, { apply: false, reason: "provider_is_manual" });
  });

  it("ignores abandoned checkout when provider is still none", () => {
    const result = shouldApplyRazorpayTerminalEvent(
      { provider: "none", providerSubscriptionId: null },
      "sub_abandoned",
    );
    assert.deepEqual(result, { apply: false, reason: "no_linked_razorpay_subscription" });
  });

  it("ignores mismatched Razorpay subscription ids (sub_B cannot wipe sub_A)", () => {
    const result = shouldApplyRazorpayTerminalEvent(
      { provider: "razorpay", providerSubscriptionId: "sub_A" },
      "sub_B",
    );
    assert.deepEqual(result, { apply: false, reason: "subscription_id_mismatch" });
  });

  it("applies when provider and subscription id match", () => {
    const result = shouldApplyRazorpayTerminalEvent(
      { provider: "razorpay", providerSubscriptionId: "sub_A" },
      "sub_A",
    );
    assert.deepEqual(result, { apply: true });
  });

  it("ignores razorpay rows that never bound a subscription id", () => {
    const result = shouldApplyRazorpayTerminalEvent(
      { provider: "razorpay", providerSubscriptionId: null },
      "sub_A",
    );
    assert.deepEqual(result, { apply: false, reason: "missing_local_subscription_id" });
  });
});
