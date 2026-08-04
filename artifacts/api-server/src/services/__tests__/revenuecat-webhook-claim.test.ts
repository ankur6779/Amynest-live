import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decideRevenueCatWebhookClaim,
  REVENUECAT_WEBHOOK_STALE_PENDING_MS,
} from "../revenuecat-webhook-claim.js";

describe("decideRevenueCatWebhookClaim", () => {
  it("processes newly inserted events", () => {
    assert.deepEqual(decideRevenueCatWebhookClaim({ inserted: true }), {
      action: "process",
      reason: "new_event",
    });
  });

  it("ACKs only processed/ignored duplicates", () => {
    assert.equal(
      decideRevenueCatWebhookClaim({
        inserted: false,
        processingStatus: "processed",
      }).action,
      "duplicate",
    );
    assert.equal(
      decideRevenueCatWebhookClaim({
        inserted: false,
        processingStatus: "ignored",
      }).action,
      "duplicate",
    );
  });

  it("reclaims failed events so RevenueCat retries can apply premium", () => {
    const decision = decideRevenueCatWebhookClaim({
      inserted: false,
      processingStatus: "failed",
    });
    assert.equal(decision.action, "reclaim");
    assert.equal(decision.reason, "prior_failure");
  });

  it("does not ACK fresh pending (in-flight) deliveries", () => {
    const now = new Date("2026-08-04T12:00:00.000Z");
    const decision = decideRevenueCatWebhookClaim({
      inserted: false,
      processingStatus: "pending",
      receivedAt: new Date(now.getTime() - 30_000),
      now,
    });
    assert.equal(decision.action, "in_progress");
  });

  it("reclaims stale pending left by crash/OOM before mark-failed", () => {
    const now = new Date("2026-08-04T12:00:00.000Z");
    const decision = decideRevenueCatWebhookClaim({
      inserted: false,
      processingStatus: "pending",
      receivedAt: new Date(now.getTime() - REVENUECAT_WEBHOOK_STALE_PENDING_MS - 1),
      now,
    });
    assert.equal(decision.action, "reclaim");
    assert.equal(decision.reason, "stale_pending");
  });

  it("refuses to ACK when the prior claim row is missing", () => {
    assert.equal(
      decideRevenueCatWebhookClaim({ inserted: false }).action,
      "in_progress",
    );
  });
});
