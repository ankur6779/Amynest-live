import { describe, expect, it } from "vitest";
import {
  applyTeacherDelivery,
  combineTeacherLead,
  detectEffortRecovery,
  getGuidanceTier,
  pickTeacherPhrase,
  resetTeacherPhraseRotation,
  resetTeacherPraiseSpacing,
  shouldThrottlePraise,
  wrapWithGuidanceStructure,
} from "./amy-voice-teacher";

describe("amy-voice-teacher", () => {
  it("combines framing and instruction naturally", () => {
    const combined = combineTeacherLead("Let's try this", "Add twelve apples.");
    expect(combined).toMatch(/Let's try this… add twelve apples/i);
  });

  it("rotates phrase variants", () => {
    resetTeacherPhraseRotation();
    const pool = ["A", "B", "C"] as const;
    expect(pickTeacherPhrase(pool, "test")).toBe("A");
    expect(pickTeacherPhrase(pool, "test")).toBe("B");
    expect(pickTeacherPhrase(pool, "test")).toBe("C");
    expect(pickTeacherPhrase(pool, "test")).toBe("A");
  });

  it("detects effort recovery after struggle", () => {
    expect(detectEffortRecovery("struggling", "neutral", "feedback")).toBe(true);
    expect(detectEffortRecovery("neutral", "confident", "feedback")).toBe(false);
  });

  it("frames only the first phrase in multi-step neutral flows", () => {
    resetTeacherPhraseRotation();
    const out = applyTeacherDelivery({
      phrases: ["Step three of five.", "Add twelve apples."],
      intent: "instruction",
      difficulty: "neutral",
      previousDifficulty: "neutral",
      speechMode: "mixed",
      multiStep: true,
      successStreak: 0,
    });
    expect(out[0]).toMatch(/let's try this|watch carefully|here's the next step|alright/i);
    expect(out[1]).toBe("Add twelve apples.");
  });

  it("adds recovery support when struggling without extra layers", () => {
    resetTeacherPhraseRotation();
    const out = applyTeacherDelivery({
      phrases: ["Add twelve apples.", "Then subtract four."],
      intent: "instruction",
      difficulty: "struggling",
      previousDifficulty: "struggling",
      speechMode: "mixed",
      multiStep: true,
    });
    expect(out[0]).toMatch(/that's okay|you're getting closer|let's try it together/i);
    expect(out[0]).toMatch(/add twelve apples/i);
    expect(out[1]).toBe("Then subtract four.");
  });

  it("uses effort-aware praise after improvement", () => {
    resetTeacherPhraseRotation();
    resetTeacherPraiseSpacing();
    const out = applyTeacherDelivery({
      phrases: ["Good job!"],
      intent: "feedback",
      difficulty: "neutral",
      previousDifficulty: "struggling",
      speechMode: "word",
      multiStep: false,
    });
    expect(out[0]).toMatch(/tricky|sticking with it|kept going/i);
  });

  it("throttles praise to light acknowledgments when recent praise was used", () => {
    resetTeacherPhraseRotation();
    resetTeacherPraiseSpacing();
    applyTeacherDelivery({
      phrases: ["Good job!"],
      intent: "feedback",
      difficulty: "neutral",
      previousDifficulty: "struggling",
      speechMode: "word",
      multiStep: false,
    });
    expect(shouldThrottlePraise()).toBe(true);

    const out = applyTeacherDelivery({
      phrases: ["Well done!"],
      intent: "feedback",
      difficulty: "neutral",
      previousDifficulty: "struggling",
      speechMode: "word",
      multiStep: false,
    });
    expect(out[0]).toMatch(/nice|got it|there you go|right/i);
    expect(out[0]).not.toMatch(/tricky|sticking with it/i);
  });

  it("skips teacher layers when learner is on a success streak", () => {
    resetTeacherPhraseRotation();
    const out = applyTeacherDelivery({
      phrases: ["Add twelve apples.", "Subtract four."],
      intent: "instruction",
      difficulty: "neutral",
      previousDifficulty: "neutral",
      speechMode: "mixed",
      multiStep: true,
      successStreak: 2,
    });
    expect(out).toEqual(["Add twelve apples.", "Subtract four."]);
  });

  it("uses structural variation for guidance", () => {
    const prefix = wrapWithGuidanceStructure("Let's try this", "Add twelve apples.", "prefix");
    const suffix = wrapWithGuidanceStructure("Let's try this", "Add twelve apples.", "suffix");
    const embedded = wrapWithGuidanceStructure("Let's try this", "Add twelve apples.", "embedded");

    expect(prefix).toMatch(/let's try this… add twelve apples/i);
    expect(suffix).toMatch(/add twelve apples (now|next|when you're ready)/i);
    expect(embedded).toMatch(/let's add twelve apples/i);
  });

  it("assigns guidance tiers based on performance", () => {
    expect(
      getGuidanceTier({
        phrases: ["a"],
        intent: "instruction",
        difficulty: "confident",
        previousDifficulty: "neutral",
        speechMode: "mixed",
        multiStep: true,
        successStreak: 0,
      }),
    ).toBe("minimal");

    expect(
      getGuidanceTier({
        phrases: ["a", "b"],
        intent: "instruction",
        difficulty: "neutral",
        previousDifficulty: "neutral",
        speechMode: "mixed",
        multiStep: true,
        successStreak: 0,
      }),
    ).toBe("light");

    expect(
      getGuidanceTier({
        phrases: ["a"],
        intent: "instruction",
        difficulty: "struggling",
        previousDifficulty: "struggling",
        speechMode: "mixed",
        multiStep: false,
        successStreak: 0,
      }),
    ).toBe("full");
  });
});
