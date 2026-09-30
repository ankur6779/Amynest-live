import { describe, expect, it, beforeEach } from "vitest";
import {
  clearLearningZonePremiumCaches,
  shouldClearLearningZonePremiumCaches,
} from "@/lib/learning-zone-premium-cache";

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

  it("allows content-cache clear after a settled non-premium entitlement resolve", () => {
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

describe("clearLearningZonePremiumCaches", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("clears regenerable study batches but preserves phonics progress and sync queues", () => {
    localStorage.setItem("amynest:study:batch:1:math:IN", JSON.stringify({ q: 1 }));
    localStorage.setItem(
      "amynest:phonics-v3-mastery:42",
      JSON.stringify({ version: 3, words: { cat: { isMastered: true } } }),
    );
    localStorage.setItem(
      "amynest:phonics-v3-sync-queue:42",
      JSON.stringify([{ domain: "mastery", clientUpdatedAt: 1 }]),
    );
    localStorage.setItem("amynest:phonics-v3-stories:42", JSON.stringify({ stories: {} }));
    localStorage.setItem("amynest:phonics-v2-journey:42", JSON.stringify({ day: 2 }));
    localStorage.setItem("amynest:phonics-habit:42", JSON.stringify({ streak: 3 }));
    localStorage.setItem("amynest:phonics-adaptive:42", JSON.stringify({ level: 1 }));

    clearLearningZonePremiumCaches();

    expect(localStorage.getItem("amynest:study:batch:1:math:IN")).toBeNull();
    expect(localStorage.getItem("amynest:phonics-v3-mastery:42")).not.toBeNull();
    expect(localStorage.getItem("amynest:phonics-v3-sync-queue:42")).not.toBeNull();
    expect(localStorage.getItem("amynest:phonics-v3-stories:42")).not.toBeNull();
    expect(localStorage.getItem("amynest:phonics-v2-journey:42")).not.toBeNull();
    expect(localStorage.getItem("amynest:phonics-habit:42")).not.toBeNull();
    expect(localStorage.getItem("amynest:phonics-adaptive:42")).not.toBeNull();
  });
});
