import { describe, expect, it } from "vitest";
import { shouldClearLearningZonePremiumCaches } from "@/lib/learning-zone-premium-cache";

describe("shouldClearLearningZonePremiumCaches", () => {
  it("clears on sign-out", () => {
    expect(
      shouldClearLearningZonePremiumCaches({
        isSignedIn: false,
        isFetched: false,
        isPlaceholderData: true,
        isPremium: undefined,
      }),
    ).toBe(true);
  });

  it("does not clear UI-only FREE placeholder while still premium in reality", () => {
    expect(
      shouldClearLearningZonePremiumCaches({
        isSignedIn: true,
        isFetched: false,
        isPlaceholderData: true,
        isPremium: false,
      }),
    ).toBe(false);
  });

  it("does not clear before the subscription query has fetched", () => {
    expect(
      shouldClearLearningZonePremiumCaches({
        isSignedIn: true,
        isFetched: false,
        isPlaceholderData: false,
        isPremium: false,
      }),
    ).toBe(false);
  });

  it("clears only after a settled non-premium entitlement resolve", () => {
    expect(
      shouldClearLearningZonePremiumCaches({
        isSignedIn: true,
        isFetched: true,
        isPlaceholderData: false,
        isPremium: false,
      }),
    ).toBe(true);
  });

  it("keeps caches when settled entitlement is premium", () => {
    expect(
      shouldClearLearningZonePremiumCaches({
        isSignedIn: true,
        isFetched: true,
        isPlaceholderData: false,
        isPremium: true,
      }),
    ).toBe(false);
  });
});
