import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  trackValueBridgeEligible,
  trackValueBridgeNotShown,
  trackValueBridgeSuppressed,
} from "@/lib/value-bridge-analytics";

const trackSubscriptionEvent = vi.fn();

vi.mock("@/lib/subscription-analytics", () => ({
  trackSubscriptionEvent: (...args: unknown[]) => trackSubscriptionEvent(...args),
}));

vi.mock("@/lib/analytics/analytics-service", () => ({
  getAnalyticsService: () => ({
    getContext: () => ({
      appVersion: "test",
      subscriptionState: "TRIAL",
    }),
  }),
}));

vi.mock("@/lib/analytics/context", () => ({
  resolveAppVersion: () => "test",
}));

describe("value-bridge-analytics", () => {
  beforeEach(() => {
    trackSubscriptionEvent.mockClear();
  });

  const meta = {
    route: "/dashboard",
    trialState: "trialing",
    subscriptionState: "TRIAL",
    userId: "u1",
  };

  it("emits value_bridge_eligible per moment trigger", () => {
    trackValueBridgeEligible("routine_completion", meta);

    expect(trackSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "value_bridge_eligible",
        source: "routine_completion",
        extra: expect.objectContaining({ moment: "routine_completion" }),
      }),
    );
  });

  it("emits value_bridge_suppressed with reason for eligible users", () => {
    trackValueBridgeSuppressed("already_seen_today", "weekly_summary", meta, {
      moment: "weekly_summary",
    });

    expect(trackSubscriptionEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "value_bridge_suppressed",
        source: "weekly_summary",
        extra: expect.objectContaining({
          reason: "already_seen_today",
          moment: "weekly_summary",
        }),
      }),
    );
  });

  it("emits value_bridge_not_shown for ineligible paths", () => {
    trackValueBridgeNotShown("feature_flag_off", "routine_completion", meta, {
      moment: "routine_completion",
    });
    trackValueBridgeNotShown("missing_value_moment", "routine_completion", meta);

    expect(trackSubscriptionEvent).toHaveBeenCalledTimes(2);
    expect(trackSubscriptionEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: "value_bridge_not_shown",
        extra: expect.objectContaining({ reason: "feature_flag_off" }),
      }),
    );
    expect(trackSubscriptionEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        event: "value_bridge_not_shown",
        extra: expect.objectContaining({ reason: "missing_value_moment" }),
      }),
    );
  });
});
