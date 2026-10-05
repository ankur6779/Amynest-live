import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  filterPreauthEvents,
  isValidPreauthDeviceId,
  preauthUserId,
  sanitizePreauthEvents,
} from "./preauthAnalyticsService";

describe("preauth analytics policy", () => {
  it("accepts hyphenated UUIDs used by the Android / web device id", () => {
    assert.equal(isValidPreauthDeviceId("123e4567-e89b-12d3-a456-426614174000"), true);
    assert.equal(isValidPreauthDeviceId("short"), false);
  });

  it("scopes anonymous users as device:{id}", () => {
    assert.equal(preauthUserId("abc12345"), "device:abc12345");
  });

  it("allows the conversion spine before authentication and drops purchases", () => {
    const { allowed, rejected } = filterPreauthEvents([
      { name: "first_open" },
      { name: "onboarding_completed" },
      { name: "first_plan_generated" },
      { name: "paywall_view" },
      { name: "checkout_started" },
      { name: "speech_coach_v2_session_start" },
      { name: "purchase_success" },
      { name: "upgrade_completed" },
    ]);
    assert.equal(rejected, 2);
    assert.deepEqual(
      allowed.map((e) => e.name),
      [
        "first_open",
        "onboarding_completed",
        "first_plan_generated",
        "paywall_view",
        "checkout_started",
        "speech_coach_v2_session_start",
      ],
    );
  });

  it("strips client-supplied identity and revenue from unsigned props", () => {
    const [event] = sanitizePreauthEvents([
      {
        name: "first_open",
        props: {
          cold: true,
          user_id: "attacker-uid",
          canonical_user_id: "attacker-uid",
          firebase_uid: "attacker-uid",
          revenue: 499,
          value: 499,
          entitlement_state: "premium",
          device_id: "keep-device",
        },
      },
    ]);
    assert.equal(event?.props?.cold, true);
    assert.equal(event?.props?.device_id, "keep-device");
    assert.equal("user_id" in (event?.props ?? {}), false);
    assert.equal("canonical_user_id" in (event?.props ?? {}), false);
    assert.equal("revenue" in (event?.props ?? {}), false);
    assert.equal("entitlement_state" in (event?.props ?? {}), false);
  });
});
