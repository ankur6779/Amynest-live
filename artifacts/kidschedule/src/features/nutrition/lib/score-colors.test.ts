import { describe, expect, it } from "vitest";
import {
  scoreBarColor,
  scoreColor,
  scoreRingStroke,
  scoreTier,
} from "@/features/nutrition/lib/score-colors";

describe("score ring thresholds", () => {
  it("classifies warning tier for 0–40", () => {
    expect(scoreTier(0)).toBe("warning");
    expect(scoreTier(40)).toBe("warning");
    expect(scoreColor(25)).toContain("orange");
    expect(scoreBarColor(25)).toContain("orange");
    expect(scoreRingStroke(25)).toContain("orange");
  });

  it("classifies progress tier for 41–79", () => {
    expect(scoreTier(41)).toBe("progress");
    expect(scoreTier(79)).toBe("progress");
    expect(scoreColor(60)).toContain("amber");
    expect(scoreBarColor(60)).toContain("amber");
    expect(scoreRingStroke(60)).toContain("amber");
  });

  it("classifies success tier for 80–100", () => {
    expect(scoreTier(80)).toBe("success");
    expect(scoreTier(100)).toBe("success");
    expect(scoreColor(90)).toContain("emerald");
    expect(scoreBarColor(90)).toContain("emerald");
    expect(scoreRingStroke(90)).toContain("emerald");
  });
});
