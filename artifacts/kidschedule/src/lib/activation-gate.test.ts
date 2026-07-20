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

  it("does not defer after routine exists", () => {
    expect(shouldDeferPaywallForActivation("hub_locked", 2)).toBe(false);
  });

  it("does not defer after first_routine_generated milestone", () => {
    localStorage.setItem(
      MILESTONES_KEY,
      JSON.stringify(["first_routine_generated"]),
    );
    expect(hasFirstRoutineActivationProgress(0)).toBe(true);
    expect(shouldDeferPaywallForActivation("hub_locked", 0)).toBe(false);
  });

  it("bypasses generate paywall when user has no routines", () => {
    expect(shouldBypassRoutineGeneratePaywall(0)).toBe(true);
    expect(shouldBypassRoutineGeneratePaywall(1)).toBe(false);
  });

  it("does not defer after durable first-routine flag", () => {
    localStorage.setItem("amynest:sub:first_routine_activated", "1");
    expect(hasFirstRoutineActivationProgress(0)).toBe(true);
    expect(shouldDeferPaywallForActivation("hub_locked", 0)).toBe(false);
  });
});
