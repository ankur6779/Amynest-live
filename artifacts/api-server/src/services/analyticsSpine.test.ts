import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyServerIdentity,
  classifyAcquisition,
  pickSpineProps,
  purchaseDedupeKey,
  scrubServerAnalyticsProps,
} from "./analyticsSpine";
import { classifyRevenueCatWebhook } from "./revenueCatPurchaseClass";

describe("analytics spine", () => {
  it("strips secrets, prompts, and client identity", () => {
    const clean = scrubServerAnalyticsProps({
      screen: "/dashboard",
      password: "secret",
      prompt: "tell me about my child",
      message: "raw chat",
      canonical_user_id: "attacker",
      firebase_uid: "attacker",
      email: "parent@example.com",
      child_name: "Ava",
      token: "jwt",
    });
    assert.equal(clean.screen, "/dashboard");
    assert.equal("password" in clean, false);
    assert.equal("prompt" in clean, false);
    assert.equal("message" in clean, false);
    assert.equal("canonical_user_id" in clean, false);
    assert.equal("email" in clean, false);
    assert.equal("child_name" in clean, false);
  });

  it("drops numeric child ids and does not invent a child ref without a secret", () => {
    const previous = process.env.ANALYTICS_CHILD_REF_SECRET;
    delete process.env.ANALYTICS_CHILD_REF_SECRET;
    try {
      const clean = scrubServerAnalyticsProps({
        screen: "/games",
        childId: 7,
        child_id: 8,
        child_ref: "client-supplied",
        diagnosis: "private",
        medication: "private",
        nested: { childId: 9, child_name: "Ava" },
      });
      assert.equal(clean.screen, "/games");
      assert.equal("childId" in clean, false);
      assert.equal("child_id" in clean, false);
      assert.equal("child_ref" in clean, false);
      assert.equal("diagnosis" in clean, false);
      assert.equal("medication" in clean, false);
      const nested = clean.nested as Record<string, unknown>;
      assert.equal("childId" in nested, false);
      assert.equal("child_name" in nested, false);
    } finally {
      if (previous === undefined) delete process.env.ANALYTICS_CHILD_REF_SECRET;
      else process.env.ANALYTICS_CHILD_REF_SECRET = previous;
    }
  });

  it("replaces a legacy child id with a pseudonymous ref only when the server secret is set", () => {
    const previous = process.env.ANALYTICS_CHILD_REF_SECRET;
    process.env.ANALYTICS_CHILD_REF_SECRET = "analytics-child-ref-test-secret";
    try {
      const first = scrubServerAnalyticsProps({ childId: 7, screen: "/speech-coach" });
      const second = scrubServerAnalyticsProps({ child_id: "8", screen: "/speech-coach" });
      assert.match(String(first.child_ref), /^[a-f0-9]{24}$/);
      assert.notEqual(first.child_ref, "7");
      assert.notEqual(first.child_ref, second.child_ref);
      assert.equal("childId" in first, false);
      assert.equal(JSON.stringify(first).includes("analytics-child-ref-test-secret"), false);
      const kept = pickSpineProps(first);
      assert.equal(kept.child_ref, first.child_ref);
    } finally {
      if (previous === undefined) delete process.env.ANALYTICS_CHILD_REF_SECRET;
      else process.env.ANALYTICS_CHILD_REF_SECRET = previous;
    }
  });

  it("resolves canonical identity on the server and ignores the client copy", () => {
    const props = applyServerIdentity(
      { screen: "/dashboard", canonical_user_id: "spoofed" },
      { userId: "firebase-uid-1", deviceId: "device-12345678", eventId: "evt-12345678" },
    );
    assert.equal(props.canonical_user_id, "firebase-uid-1");
    assert.equal(props.firebase_uid, "firebase-uid-1");
    assert.equal(props.anonymous_device_id, "device-12345678");
    assert.equal(props.event_id, "evt-12345678");
  });

  it("does not invent a canonical user for anonymous events", () => {
    const props = applyServerIdentity(
      { screen: "/welcome" },
      { userId: "device:device-12345678", deviceId: "device-12345678" },
    );
    assert.equal("canonical_user_id" in props, false);
    assert.equal(props.anonymous_device_id, "device-12345678");
  });

  it("dedupes purchase authority by event name and transaction id", () => {
    assert.equal(
      purchaseDedupeKey("purchase_success", { transaction_id: "GPA.1" }),
      "purchase_success:GPA.1",
    );
    assert.equal(
      purchaseDedupeKey("upgrade_completed", { transaction_id: "GPA.1" }),
      "upgrade_completed:GPA.1",
    );
    assert.equal(
      purchaseDedupeKey("subscription_funnel_event", { step: "purchase_success", transaction_id: "GPA.1" }),
      "subscription_funnel_event:purchase_success:GPA.1",
    );
    assert.equal(purchaseDedupeKey("page_view", { transaction_id: "GPA.1" }), null);
    assert.equal(purchaseDedupeKey("purchase_success", {}), null);
  });

  it("does not call a user Google Ads acquired without a click id", () => {
    assert.equal(classifyAcquisition({ install_source: "google_ads", campaign_id: "23986249354" }), "attribution_unknown");
    assert.equal(classifyAcquisition({ gclid: "abc", install_source: "google_ads" }), "verified_paid");
    assert.equal(classifyAcquisition({ install_source: "organic" }), "organic");
    assert.equal(classifyAcquisition({}), "attribution_unknown");
  });

  it("keeps installation id and route after schema stripping", () => {
    const kept = pickSpineProps({
      installation_id: "device-12345678",
      session_id: "sess-1",
      route: "/speech-coach",
      child_name: "Ava",
    });
    assert.equal(kept.installation_id, "device-12345678");
    assert.equal(kept.session_id, "sess-1");
    assert.equal(kept.route, "/speech-coach");
    assert.equal("child_name" in kept, false);
  });

  it("does not treat a RevenueCat trial or unpriced intro as a paid conversion", () => {
    const trial = classifyRevenueCatWebhook({ type: "INITIAL_PURCHASE", periodType: "TRIAL", price: 0 });
    assert.equal(trial.countsAsPaid, false);
    assert.equal(trial.recordPaidPurchase, false);
    assert.equal(trial.funnelStep, "trial_started");
    const intro = classifyRevenueCatWebhook({ type: "INITIAL_PURCHASE", periodType: "INTRO" });
    assert.equal(intro.countsAsPaid, false);
    assert.equal(intro.funnelStep, "introductory_unpriced");
    const missing = classifyRevenueCatWebhook({ type: "INITIAL_PURCHASE" });
    assert.equal(missing.countsAsPaid, false);
    assert.equal(missing.purchaseClass, "unknown");
  });
});
