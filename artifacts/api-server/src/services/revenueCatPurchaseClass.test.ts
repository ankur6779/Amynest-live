import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyRevenueCatWebhook, classifyStoredWebhookPayload } from "./revenueCatPurchaseClass";

describe("RevenueCat webhook purchase classification", () => {
  it("initial NORMAL purchase with a price is paid and gross is present", () => {
    const decision = classifyRevenueCatWebhook({
      type: "INITIAL_PURCHASE",
      periodType: "NORMAL",
      price: 499,
    });
    assert.equal(decision.countsAsPaid, true);
    assert.equal(decision.recordPaidPurchase, true);
    assert.equal(decision.purchaseClass, "paid");
    assert.equal(decision.revenue, "gross_present");
  });

  it("initial TRIAL is not a paid conversion", () => {
    const decision = classifyRevenueCatWebhook({
      type: "INITIAL_PURCHASE",
      periodType: "TRIAL",
      price: 0,
    });
    assert.equal(decision.countsAsPaid, false);
    assert.equal(decision.recordPaidPurchase, false);
    assert.equal(decision.funnelStep, "trial_started");
    assert.equal(decision.revenue, "not_applicable");
  });

  it("priced introductory offer counts as paid introductory, not a trial", () => {
    const decision = classifyRevenueCatWebhook({
      type: "INITIAL_PURCHASE",
      periodType: "INTRO",
      price: 99,
    });
    assert.equal(decision.countsAsPaid, true);
    assert.equal(decision.purchaseClass, "introductory");
    assert.equal(decision.revenue, "gross_present");
  });

  it("introductory offer without a positive price is not paid", () => {
    const decision = classifyRevenueCatWebhook({
      type: "INITIAL_PURCHASE",
      periodType: "INTRO",
      price: 0,
    });
    assert.equal(decision.countsAsPaid, false);
    assert.equal(decision.recordPaidPurchase, false);
    assert.equal(decision.funnelStep, "introductory_unpriced");
    assert.equal(decision.revenue, "gross_missing");
  });

  it("renewal is not a new paid conversion", () => {
    const decision = classifyRevenueCatWebhook({
      type: "RENEWAL",
      periodType: "NORMAL",
      price: 499,
    });
    assert.equal(decision.recordPaidPurchase, false);
    assert.equal(decision.countsAsPaid, false);
    assert.equal(decision.funnelStep, "subscription_renewed");
  });

  it("customer cancellation is not a refund", () => {
    const decision = classifyRevenueCatWebhook({
      type: "CANCELLATION",
      cancelReason: "UNSUBSCRIBE",
    });
    assert.equal(decision.funnelStep, "subscription_cancelled");
    assert.equal(decision.countsAsPaid, false);
    assert.equal(decision.revenue, "not_applicable");
  });

  it("customer-support cancellation and REFUND record a refund without an amount", () => {
    const support = classifyRevenueCatWebhook({
      type: "CANCELLATION",
      cancelReason: "CUSTOMER_SUPPORT",
    });
    const refund = classifyRevenueCatWebhook({ type: "REFUND", price: 499 });
    assert.equal(support.funnelStep, "refund");
    assert.equal(refund.funnelStep, "refund");
    assert.equal(support.revenue, "not_applicable");
    assert.equal(refund.revenue, "not_applicable");
  });

  it("billing issue is not a paid conversion", () => {
    const decision = classifyRevenueCatWebhook({ type: "BILLING_ISSUE", price: 499 });
    assert.equal(decision.funnelStep, "billing_issue");
    assert.equal(decision.countsAsPaid, false);
  });

  it("a duplicate delivery classifies the same way and does not become paid", () => {
    const first = classifyRevenueCatWebhook({ type: "INITIAL_PURCHASE", periodType: "TRIAL" });
    const second = classifyRevenueCatWebhook({ type: "INITIAL_PURCHASE", periodType: "TRIAL" });
    assert.deepEqual(second, first);
    assert.equal(second.countsAsPaid, false);
  });

  it("an earlier renewal does not change a later initial classification", () => {
    const renewal = classifyRevenueCatWebhook({ type: "RENEWAL", periodType: "NORMAL", price: 499 });
    const initial = classifyRevenueCatWebhook({ type: "INITIAL_PURCHASE", periodType: "TRIAL" });
    assert.equal(renewal.funnelStep, "subscription_renewed");
    assert.equal(initial.funnelStep, "trial_started");
    assert.equal(initial.countsAsPaid, false);
  });

  it("missing price on a normal purchase stays paid and marks gross missing", () => {
    const decision = classifyRevenueCatWebhook({
      type: "INITIAL_PURCHASE",
      periodType: "NORMAL",
      price: null,
    });
    assert.equal(decision.countsAsPaid, true);
    assert.equal(decision.purchaseClass, "paid");
    assert.equal(decision.revenue, "gross_missing");
  });

  it("promotional grant is not a paid purchase", () => {
    const decision = classifyRevenueCatWebhook({
      type: "INITIAL_PURCHASE",
      periodType: "PROMOTIONAL",
      price: 0,
    });
    assert.equal(decision.countsAsPaid, false);
    assert.equal(decision.funnelStep, "promotional_grant");
  });

  it("the same transaction classifies independently of which source asks", () => {
    const fromWebhook = classifyRevenueCatWebhook({
      type: "INITIAL_PURCHASE",
      periodType: "NORMAL",
      price: 499,
    });
    const fromReplay = classifyRevenueCatWebhook({
      type: "INITIAL_PURCHASE",
      periodType: "NORMAL",
      price: 499,
    });
    assert.deepEqual(fromReplay, fromWebhook);
    assert.equal(fromWebhook.purchaseClass, "paid");
  });

  it("classifies stored webhook fixtures without copying the payload", () => {
    const secretUser = "rc-user-should-not-leak";
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ event: { type: "INITIAL_PURCHASE", period_type: "TRIAL", price: 0, app_user_id: secretUser } }, "trial_initial"],
      [{ event: { type: "INITIAL_PURCHASE", period_type: "NORMAL", price: 499, app_user_id: secretUser } }, "paid_initial"],
      [{ event: { type: "INITIAL_PURCHASE", period_type: "INTRO", price: 49, app_user_id: secretUser } }, "introductory_priced"],
      [{ event: { type: "INITIAL_PURCHASE", period_type: "INTRO", price: 0, app_user_id: secretUser } }, "introductory_unpriced"],
      [{ event: { type: "INITIAL_PURCHASE", period_type: "PROMOTIONAL", app_user_id: secretUser } }, "promotional"],
      [{ event: { type: "INITIAL_PURCHASE", app_user_id: secretUser } }, "unknown_initial"],
      [{ event: { type: "RENEWAL", period_type: "NORMAL", price: 499, app_user_id: secretUser } }, "renewal"],
      [{ event: { type: "CANCELLATION", cancel_reason: "UNSUBSCRIBE", app_user_id: secretUser } }, "cancellation"],
      [{ event: { type: "CANCELLATION", cancel_reason: "CUSTOMER_SUPPORT", app_user_id: secretUser } }, "refund"],
      [{ event: { type: "REFUND", app_user_id: secretUser } }, "refund"],
      [{ event: { type: "BILLING_ISSUE", app_user_id: secretUser } }, "billing_issue"],
      [{ event: { type: "TEST", app_user_id: secretUser } }, "unclassified"],
    ];
    for (const [payload, expected] of cases) {
      const result = classifyStoredWebhookPayload(payload);
      assert.equal(result, expected);
      assert.equal(JSON.stringify(result).includes(secretUser), false);
      assert.equal(typeof result, "string");
    }
  });
});
