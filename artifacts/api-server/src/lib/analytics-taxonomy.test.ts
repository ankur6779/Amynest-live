/**
 * Analytics taxonomy validation — pure unit tests (no DB). Guards the single
 * source of truth that both client typing and server ingest rely on.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateAnalyticsEvent,
  isKnownAnalyticsEvent,
  analyticsEventCategory,
  ANALYTICS_EVENT_NAMES,
} from "@workspace/analytics-taxonomy";

describe("analytics taxonomy", () => {
  it("exposes a non-empty, unique event catalog", () => {
    assert.ok(ANALYTICS_EVENT_NAMES.length >= 5);
    assert.equal(new Set(ANALYTICS_EVENT_NAMES).size, ANALYTICS_EVENT_NAMES.length);
  });

  it("every catalog event has a category", () => {
    for (const name of ANALYTICS_EVENT_NAMES) {
      assert.ok(analyticsEventCategory(name), `missing category for ${name}`);
    }
  });

  it("recognizes known events and rejects unknown ones", () => {
    assert.equal(isKnownAnalyticsEvent("routine_viewed"), true);
    assert.equal(isKnownAnalyticsEvent("definitely_not_an_event"), false);
  });

  it("accepts a valid event and returns its category + parsed props", () => {
    const r = validateAnalyticsEvent("routine_viewed", {
      routineId: 12,
      dateMode: "today",
    });
    assert.equal(r.valid, true);
    if (r.valid) {
      assert.equal(r.category, "routine");
      assert.equal(r.props.routineId, 12);
    }
  });

  it("rejects an unknown event name with reason unknown_event", () => {
    const r = validateAnalyticsEvent("made_up_event", {});
    assert.equal(r.valid, false);
    if (!r.valid) assert.equal(r.reason, "unknown_event");
  });

  it("rejects bad prop types with reason invalid_props", () => {
    const r = validateAnalyticsEvent("routine_viewed", { dateMode: "someday" });
    assert.equal(r.valid, false);
    if (!r.valid) assert.equal(r.reason, "invalid_props");
  });

  it("requires the signal prop for routine_feedback_submitted", () => {
    const missing = validateAnalyticsEvent("routine_feedback_submitted", {});
    assert.equal(missing.valid, false);
    const ok = validateAnalyticsEvent("routine_feedback_submitted", {
      signal: "worked_well",
      scope: "routine",
    });
    assert.equal(ok.valid, true);
  });

  it("allows forward-compatible unknown props on a known event", () => {
    const r = validateAnalyticsEvent("app_open", { cold: true, futureField: "x" });
    assert.equal(r.valid, true);
  });

  it("validates first-value activation events", () => {
    assert.equal(isKnownAnalyticsEvent("dashboard_view"), true);
    assert.equal(isKnownAnalyticsEvent("routine_cta_clicked"), true);
    assert.equal(isKnownAnalyticsEvent("first_value_achieved"), true);
    const r = validateAnalyticsEvent("routine_cta_clicked", { source: "first_value_hero" });
    assert.equal(r.valid, true);
    if (r.valid) assert.equal(r.category, "growth");
  });
});
