import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyServerIdentity,
  classifyAcquisition,
  purchaseDedupeKey,
  scrubServerAnalyticsProps,
} from "./analyticsSpine";

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
});
