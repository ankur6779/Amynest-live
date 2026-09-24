import { describe, expect, it, vi, beforeEach } from "vitest";
import { CANONICAL_FUNNEL_EVENTS } from "@workspace/analytics-taxonomy";
import { FUNNEL_LEGACY_ALIASES, resetConversionFunnelOnceForTests, trackConversionFunnel } from "./conversion-funnel";

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

vi.mock("@/lib/firebase-subscription-attribution", () => ({
  trackFirebaseQualitySignal: vi.fn(),
}));

vi.mock("@/lib/subscription-funnel-storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/subscription-funnel-storage")>(
    "@/lib/subscription-funnel-storage",
  );
  return {
    ...actual,
    markFirstPlanActionStarted: vi.fn(),
  };
});

import { track } from "@/lib/analytics";

describe("canonical conversion funnel", () => {
  it("has one name per required funnel step", () => {
    expect(CANONICAL_FUNNEL_EVENTS).toEqual([
      "first_open",
      "onboarding_started",
      "child_created",
      "onboarding_completed",
      "first_plan_generated",
      "first_value_achieved",
      "first_plan_action_started",
      "first_plan_action_completed",
      "paywall_view",
      "paywall_dismiss",
      "subscribe_clicked",
      "checkout_started",
      "purchase_success",
      "purchase_failed",
      "subscription_active",
      "restore_purchase",
    ]);
  });

  it("maps existing paywall and purchase events instead of inventing a second system", () => {
    expect(FUNNEL_LEGACY_ALIASES.paywall_view).toContain("premium_paywall_viewed");
    expect(FUNNEL_LEGACY_ALIASES.purchase_success).toContain("upgrade_completed");
    expect(FUNNEL_LEGACY_ALIASES.first_open).toContain("first_open");
  });

  it("treats first parent action as first value, not plan-ready", () => {
    resetConversionFunnelOnceForTests();
    vi.mocked(track).mockClear();
    trackConversionFunnel("first_plan_generated", { routine_id: 1 }, { onceKey: "plan-1" });
    expect(vi.mocked(track).mock.calls.map((c) => c[0])).toEqual(["first_plan_generated"]);
    trackConversionFunnel("first_plan_action_started", { routine_id: 1 }, { onceKey: "act" });
    expect(vi.mocked(track).mock.calls.map((c) => c[0])).toEqual([
      "first_plan_generated",
      "first_plan_action_started",
      "first_value_achieved",
    ]);
  });
});
