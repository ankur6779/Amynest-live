import { describe, expect, it } from "vitest";
import { ASK_AMY_SOFT_CONTINUE } from "@/lib/hard-day-monetization";
import { livingGoalLockedCta } from "@/lib/amy-coach/living-room";
import { shouldRouteToPostOnboardingFreeTrial } from "@/lib/trial-paywall-variant";
import { AI_QUOTA_COPY } from "@/lib/ai-quota-education";
import { PAYWALL_AI, PAYWALL_REASON_COPY } from "@workspace/subscription-marketing";

describe("Phase 3 conversion freeze", () => {
  it("does not auto-route the trial screen before first routine", () => {
    expect(
      shouldRouteToPostOnboardingFreeTrial({
        featureEnabled: true,
        alreadySeen: false,
        isPremiumSubscriber: false,
        hasFirstRoutine: false,
      }),
    ).toBe(false);
  });

  it("keeps Ask Amy exhaustion unselling and without ai_query", () => {
    const blob = [
      ASK_AMY_SOFT_CONTINUE.adultMessage,
      ASK_AMY_SOFT_CONTINUE.infantMessage,
      ASK_AMY_SOFT_CONTINUE.resetHint,
      AI_QUOTA_COPY.education,
    ].join(" ").toLowerCase();
    expect(blob).not.toContain("ai_query");
    expect(blob).not.toMatch(/upgrade now|unlock|zap/);
  });

  it("uses continuation CTAs for Coach and family", () => {
    expect(livingGoalLockedCta().toLowerCase()).toContain("complete coach");
    expect(livingGoalLockedCta().toLowerCase()).not.toMatch(/unlock|fomo/);
    expect(PAYWALL_REASON_COPY.child_limit.cta.toLowerCase()).toContain("family");
    expect(PAYWALL_AI.subtitle.toLowerCase()).toContain("unlimited amy help");
  });
});
