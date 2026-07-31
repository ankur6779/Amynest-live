import { describe, expect, it } from "vitest";
import { isLearningJourneyRoute } from "./learning-journey-routes";

describe("isLearningJourneyRoute", () => {
  it("matches learning prefixes and nested paths", () => {
    expect(isLearningJourneyRoute("/phonics")).toBe(true);
    expect(isLearningJourneyRoute("/phonics/test/play")).toBe(true);
    expect(isLearningJourneyRoute("/study")).toBe(true);
    expect(isLearningJourneyRoute("/abacus")).toBe(true);
    expect(isLearningJourneyRoute("/smart-math-tricks")).toBe(true);
    expect(isLearningJourneyRoute("/olympiad")).toBe(true);
    expect(isLearningJourneyRoute("/spelling")).toBe(true);
  });

  it("does not match unrelated routes", () => {
    expect(isLearningJourneyRoute("/games")).toBe(false);
    expect(isLearningJourneyRoute("/dashboard")).toBe(false);
    expect(isLearningJourneyRoute("/parenting-hub")).toBe(false);
    expect(isLearningJourneyRoute("/health-lab")).toBe(false);
    // Legacy marketing path is redirected in AppCore; not a journey prefix itself.
    expect(isLearningJourneyRoute("/learning-zone/smart-math-tricks")).toBe(false);
  });
});
