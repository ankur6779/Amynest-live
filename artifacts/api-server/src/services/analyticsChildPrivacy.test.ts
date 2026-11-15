import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  childAnalyticsRef,
  redactAnalyticsIdentifiers,
  validateAnalyticsEvent,
} from "@workspace/analytics-taxonomy";

describe("analytics child identifier privacy", () => {
  it("replaces numeric child ids and drops names and health details", () => {
    const result = validateAnalyticsEvent("speech_coach_entry", {
      source: "hero",
      child_id: 42,
      childName: "Asha",
      diagnosis: "private",
      device_id: "device-keep-0001",
    });
    assert.equal(result.valid, true);
    if (!result.valid) return;
    const encoded = JSON.stringify(result.props);
    assert.equal(result.props.source, "hero");
    assert.equal("child_id" in result.props, false);
    assert.equal("childId" in result.props, false);
    assert.equal("childName" in result.props, false);
    assert.equal("diagnosis" in result.props, false);
    assert.equal(result.props.child_ref, childAnalyticsRef(42));
    assert.doesNotMatch(encoded, /"child_id"/);
    assert.doesNotMatch(encoded, /Asha/);
    assert.doesNotMatch(encoded, /private/);
    assert.equal(encoded.includes(":42") || encoded.includes("\"42\""), false);
  });

  it("keeps a supplied child_ref stable and does not restore a raw id", () => {
    const ref = childAnalyticsRef(7);
    const redacted = redactAnalyticsIdentifiers({
      child_ref: ref,
      child_id: 7,
      symptoms: "hidden",
      user_id: "firebase-uid",
    });
    assert.equal(redacted.child_ref, ref);
    assert.equal(redacted.user_id, "firebase-uid");
    assert.equal("child_id" in redacted, false);
    assert.equal("symptoms" in redacted, false);
    assert.notEqual(childAnalyticsRef(7), childAnalyticsRef(8));
  });
});
