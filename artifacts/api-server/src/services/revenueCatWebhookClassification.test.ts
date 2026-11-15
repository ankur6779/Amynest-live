import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyRevenueCatWebhook,
  redactRevenueCatWebhookPayload,
} from "./revenueCatWebhookClassification";

describe("RevenueCat webhook classification fixtures", () => {
  it("does not count trials, introductions, cancellations, refunds, billing issues, or unknown events as paid", () => {
    const unpaid = [
      classifyRevenueCatWebhook({ type: "INITIAL_PURCHASE", period_type: "TRIAL", price: 0 }),
      classifyRevenueCatWebhook({ type: "INITIAL_PURCHASE", period_type: "INTRO", price: 99 }),
      classifyRevenueCatWebhook({ type: "CANCELLATION" }),
      classifyRevenueCatWebhook({ type: "REFUND" }),
      classifyRevenueCatWebhook({ type: "BILLING_ISSUE" }),
      classifyRevenueCatWebhook({ type: "INITIAL_PURCHASE" }),
      classifyRevenueCatWebhook({ type: "TEST" }),
    ];
    assert.deepEqual(unpaid.map((row) => row.class), [
      "trial",
      "introductory",
      "cancellation",
      "refund",
      "billing_issue",
      "unknown",
      "unknown",
    ]);
    assert.equal(unpaid.some((row) => row.countsAsPaidConversion), false);
  });

  it("counts a normal initial purchase, a renewal, and a trial conversion as paid, separately", () => {
    const paid = classifyRevenueCatWebhook({
      type: "INITIAL_PURCHASE",
      period_type: "NORMAL",
      price: 499,
    });
    const renewal = classifyRevenueCatWebhook({ type: "RENEWAL", period_type: "NORMAL", price: 499 });
    const converted = classifyRevenueCatWebhook({ type: "RENEWAL", is_trial_conversion: true, price: 499 });
    assert.equal(paid.class, "paid_initial");
    assert.equal(renewal.class, "renewal");
    assert.equal(converted.class, "trial_conversion");
    assert.equal(paid.countsAsPaidConversion && renewal.countsAsPaidConversion && converted.countsAsPaidConversion, true);
    assert.equal(paid.class === renewal.class, false);
  });

  it("stores a redacted fixture and omits subscriber attributes and email", () => {
    const stored = redactRevenueCatWebhookPayload({
      event: {
        type: "INITIAL_PURCHASE",
        period_type: "TRIAL",
        id: "evt_1",
        product_id: "amynest_monthly",
        app_user_id: "firebase-uid",
        subscriber_attributes: { $email: { value: "parent@example.com" } },
      },
      api_version: "1.0",
    });
    const encoded = JSON.stringify(stored);
    assert.equal((stored.event as { type?: string }).type, "INITIAL_PURCHASE");
    assert.equal(stored.classification, "trial");
    assert.equal(stored.countsAsPaidConversion, false);
    assert.doesNotMatch(encoded, /parent@example.com/);
    assert.doesNotMatch(encoded, /subscriber_attributes/);
    assert.doesNotMatch(encoded, /firebase-uid/);
  });
});
