import { describe, expect, it } from "vitest";
import { resolvePaywallUsageProgress } from "./paywall-usage";
import type { Entitlements } from "@/hooks/use-subscription";

function feature(used: number, limit: number) {
  return { used, limit, remaining: Math.max(0, limit - used), locked: used >= limit };
}

const baseEntitlements = {
  usage: {
    aiQueriesToday: 10,
    aiQueriesRemaining: 0,
    features: {
      ai_query: feature(10, 10),
      infant_ai_query: feature(3, 3),
      routine_generate: feature(3, 3),
      hub_speech_session: feature(1, 3),
      nutrition_week_plan: feature(1, 1),
    },
  },
} as unknown as Entitlements;

describe("resolvePaywallUsageProgress", () => {
  it("maps AI quota reasons to daily usage", () => {
    expect(resolvePaywallUsageProgress("ai_quota", baseEntitlements)).toEqual({
      used: 10,
      limit: 10,
      label: "Amy AI questions today",
    });
  });

  it("maps routines and speech quotas", () => {
    expect(resolvePaywallUsageProgress("routines_limit", baseEntitlements)?.label).toBe(
      "Personalized routines",
    );
    expect(resolvePaywallUsageProgress("speech_coach", baseEntitlements)).toEqual({
      used: 1,
      limit: 3,
      label: "Speech practice sessions",
    });
  });

  it("returns null for non-quota reasons", () => {
    expect(resolvePaywallUsageProgress("feature", baseEntitlements)).toBeNull();
    expect(resolvePaywallUsageProgress("learning_locked", baseEntitlements)).toBeNull();
  });
});
