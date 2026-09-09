import { beforeEach, describe, expect, it } from "vitest";
import {
  hasFirstRoutineActivationProgress,
  shouldBypassRoutineGeneratePaywall,
  shouldDeferPaywallForActivation,
} from "./activation-gate";

const MILESTONES_KEY = "amynest:milestones_reached";

describe("activation-gate", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defers soft paywalls before first routine", () => {
    expect(shouldDeferPaywallForActivation("hub_locked", 0)).toBe(true);
    expect(shouldDeferPaywallForActivation("ai_quota", 0)).toBe(false);
  });

  it("does not defer audio lessons — free samples and paywall must stay on-page", () => {
    expect(shouldDeferPaywallForActivation("audio_lessons", 0)).toBe(false);
  });

  it("still defers after a routine exists until the first plan action", () => {
    expect(shouldDeferPaywallForActivation("hub_locked", 2)).toBe(true);
  });

  it("does not defer after first_routine_generated until a plan action starts", () => {
    localStorage.setItem(
      MILESTONES_KEY,
      JSON.stringify(["first_routine_generated"]),
    );
    expect(hasFirstRoutineActivationProgress(0)).toBe(true);
    expect(shouldDeferPaywallForActivation("hub_locked", 0)).toBe(true);
  });

  it("bypasses generate paywall when user has no routines", () => {
    expect(shouldBypassRoutineGeneratePaywall(0)).toBe(true);
    expect(shouldBypassRoutineGeneratePaywall(1)).toBe(false);
  });

  it("does not defer after durable first-routine flag until a plan action starts", () => {
    localStorage.setItem("amynest:sub:first_routine_activated", "1");
    expect(hasFirstRoutineActivationProgress(0)).toBe(true);
    expect(shouldDeferPaywallForActivation("hub_locked", 0)).toBe(true);
  });

  it("stops deferring once the first plan action has started", () => {
    localStorage.setItem("amynest:sub:first_plan_action", "1");
    expect(shouldDeferPaywallForActivation("hub_locked", 0)).toBe(false);
  });
});
