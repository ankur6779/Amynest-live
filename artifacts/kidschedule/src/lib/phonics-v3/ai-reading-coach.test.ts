import { describe, expect, it } from "vitest";
import {
  evaluateReadingCoachAttempt,
  fluencyBandFromMetrics,
  fluencyBandLabel,
  getArticulationTip,
  normalizeScore01,
  adaptiveFocusFromConfusions,
  estimateReadingReadiness,
} from "./ai-reading-coach";
import { generateDecodableStory } from "./ai-decodable-stories";
import {
  defaultCoachConfusionState,
  recordCoachAttempt,
  focusGraphemesForPractice,
} from "./coach-confusions";

describe("ai-reading-coach", () => {
  it("normalizes 0–100 and 0–1 scores", () => {
    expect(normalizeScore01(82)).toBeCloseTo(0.82);
    expect(normalizeScore01(0.82)).toBeCloseTo(0.82);
  });

  it("detects s→sh confusion with encouraging feedback", () => {
    const ev = evaluateReadingCoachAttempt({
      expected: "s",
      transcript: "sh",
      targetKind: "phoneme",
      score: 0.4,
      correct: false,
    });
    expect(ev.confusion?.expected).toBe("s");
    expect(ev.confusion?.heard).toBe("sh");
    expect(ev.feedback.toLowerCase()).not.toContain("wrong");
    expect(ev.feedback.toLowerCase()).not.toContain("incorrect");
    expect(ev.feedback.toLowerCase()).not.toContain("failed");
    expect(ev.retryRecommended).toBe(true);
  });

  it("detects possible schwa on single consonants", () => {
    const ev = evaluateReadingCoachAttempt({
      expected: "m",
      transcript: "muh",
      targetKind: "phoneme",
    });
    expect(ev.qualityFlags.possibleSchwa).toBe(true);
    expect(ev.feedback).toMatch(/pure|uh/i);
  });

  it("provides articulation tips for core graphemes", () => {
    expect(getArticulationTip("m")?.steps.length).toBeGreaterThan(0);
    expect(getArticulationTip("f")?.steps.some((s) => /lip/i.test(s))).toBe(true);
  });

  it("bands fluency levels", () => {
    expect(fluencyBandFromMetrics({ accuracyPct: 50 })).toBe("emerging");
    expect(fluencyBandFromMetrics({ accuracyPct: 85 })).toBe("confident");
    expect(fluencyBandLabel("fluent")).toBe("Fluent");
  });

  it("stores confusions for adaptive focus", () => {
    let state = defaultCoachConfusionState();
    state = recordCoachAttempt(state, {
      pronunciationScore: 40,
      confusion: { expected: "r", heard: "w", count: 1 },
    });
    state = recordCoachAttempt(state, {
      pronunciationScore: 45,
      confusion: { expected: "r", heard: "w", count: 1 },
    });
    expect(focusGraphemesForPractice(state)).toContain("r");
    expect(adaptiveFocusFromConfusions(state.pairs)).toContain("r");
  });

  it("generates Group 1 stories without locked graphemes like digraphs", () => {
    const story = generateDecodableStory(1, 3);
    expect(story.lines.length).toBeGreaterThan(0);
    const text = story.lines.map((l) => l.text).join(" ").toLowerCase();
    expect(text).not.toMatch(/\bship\b|\bchip\b|\bthe dog\b/);
  });

  it("offers encouraging parent readiness copy", () => {
    const msg = estimateReadingReadiness({
      wordsRead: 2,
      pronunciationAvg: 40,
      fluencyBand: "emerging",
      letterGroupIndex: 1,
    });
    expect(msg.length).toBeGreaterThan(20);
  });
});
