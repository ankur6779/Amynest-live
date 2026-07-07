import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  compareValueBridgePriority,
  getSessionBridgeMoment,
  markValueBridgeShownToday,
  setSessionBridgeMoment,
  shouldTriggerValueBridge,
  valueBridgeCopy,
  wasFirstRoutineItemEverCompleted,
  wasValueBridgeShownToday,
} from "@/lib/value-bridge";
import type { Entitlements } from "@/hooks/use-subscription";

vi.mock("@/lib/subscription-feature-flags", () => ({
  FF_VALUE_BRIDGE_INVITES: true,
}));

const internalTrial: Entitlements = {
  isPremium: true,
  isTrialing: true,
  isPremiumSubscriber: false,
  provider: "none",
  subscriptionState: "TRIAL",
  internalTrialExpired: false,
  trialEndsAt: new Date(Date.now() + 3 * 86400000).toISOString(),
};

describe("value-bridge phase 1", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("prioritizes routine completion over weekly summary", () => {
    expect(
      compareValueBridgePriority("routine_completion", "weekly_summary"),
    ).toBeGreaterThan(0);
  });

  it("allows one impression per moment per day", () => {
    expect(shouldTriggerValueBridge("routine_completion", internalTrial)).toBe(
      true,
    );
    markValueBridgeShownToday("routine_completion");
    expect(wasValueBridgeShownToday("routine_completion")).toBe(true);
    expect(shouldTriggerValueBridge("routine_completion", internalTrial)).toBe(
      false,
    );
  });

  it("allows routine completion to override weekly summary in the same session", () => {
    setSessionBridgeMoment("weekly_summary");
    expect(shouldTriggerValueBridge("routine_completion", internalTrial)).toBe(
      true,
    );
    expect(shouldTriggerValueBridge("weekly_summary", internalTrial)).toBe(
      false,
    );
  });

  it("builds phase-1 copy and analytics sources", () => {
    const routine = valueBridgeCopy("routine_completion");
    expect(routine.source).toBe("routine_completion");
    expect(routine.cta).toBe("Continue Premium");
    expect(routine.message).toMatch(/first routine step/i);

    const weekly = valueBridgeCopy("weekly_summary");
    expect(weekly.source).toBe("weekly_summary");
    expect(weekly.cta).toBe("Continue Premium");
  });

  it("tracks first routine item completion separately from bridge shown", () => {
    expect(wasFirstRoutineItemEverCompleted()).toBe(false);
  });
});
