import { describe, it, expect } from "vitest";
import {
  applyCoachIntelligenceEvent,
  buildCrossGoalInsight,
  classifyWinStrategy,
  createEmptyCoachIntelligence,
  detectIntelligencePlateau,
  pickVariedPhrase,
  renderCoachIntelligencePromptBlock,
  strategiesToAvoid,
} from "@workspace/coach-journey";

describe("coaching intelligence", () => {
  it("classifies win strategies from content", () => {
    const tags = classifyWinStrategy({
      title: "Name the feeling",
      objective: "Help your child feel validated before fixing",
      actions: ["Pause", "Label the emotion"],
    });
    expect(tags).toContain("emotional_validation");
  });

  it("tracks effectiveness and derives profile after feedback", () => {
    let snap = createEmptyCoachIntelligence();
    snap = applyCoachIntelligenceEvent(snap, {
      type: "win_feedback",
      sessionId: "s1",
      goalId: "travel-with-kids",
      goalTitle: "Travel",
      winNumber: 1,
      winTitle: "Validate before redirecting",
      winObjective: "Name emotions during travel stress",
      feedback: "yes",
      at: "2026-01-01T00:00:00Z",
    });
    expect(snap.winRecords).toHaveLength(1);
    expect(snap.strategyScores.emotional_validation?.worked).toBe(1);
    expect(snap.profile.parentStyle).toBeTruthy();
  });

  it("avoids strategies with repeated failure", () => {
    let snap = createEmptyCoachIntelligence();
    for (let i = 0; i < 2; i += 1) {
      snap = applyCoachIntelligenceEvent(snap, {
        type: "win_feedback",
        sessionId: "s1",
        goalId: "manage-tantrums",
        goalTitle: "Tantrums",
        winNumber: i + 1,
        winTitle: "Offer two choices",
        winActions: ["Offer choice A or B"],
        feedback: "no",
        at: `2026-01-0${i + 1}T00:00:00Z`,
      });
    }
    expect(strategiesToAvoid(snap)).toContain("choices_autonomy");
  });

  it("pickVariedPhrase prefers unused wording", () => {
    const a = "Amy is building on what worked.";
    const b = "Amy chose this based on your answers.";
    const used = [pickVariedPhrase(0, [a], []).hash];
    const picked = pickVariedPhrase(0, [a, b], used);
    expect(picked.text).toBe(b);
  });

  it("builds cross-goal insight when strategy worked elsewhere", () => {
    let snap = createEmptyCoachIntelligence();
    snap = applyCoachIntelligenceEvent(snap, {
      type: "win_feedback",
      sessionId: "s1",
      goalId: "travel-with-kids",
      goalTitle: "Travel",
      winNumber: 1,
      winTitle: "Validate feelings during trips",
      winObjective: "Emotional validation on travel",
      feedback: "yes",
      at: "2026-01-01T00:00:00Z",
    });
    const insight = buildCrossGoalInsight(snap, "fix-bedtime-resistance");
    expect(insight?.toLowerCase()).toMatch(/another goal|family/);
  });

  it("detects plateau from recent mixed feedback", () => {
    let snap = createEmptyCoachIntelligence();
    const records = [
      { feedback: "somewhat" as const },
      { feedback: "no" as const },
      { feedback: "somewhat" as const },
      { feedback: "no" as const },
    ];
    for (const [i, r] of records.entries()) {
      snap = applyCoachIntelligenceEvent(snap, {
        type: "win_feedback",
        sessionId: "s1",
        goalId: "manage-tantrums",
        goalTitle: "Tantrums",
        winNumber: i + 1,
        winTitle: `Win ${i + 1}`,
        feedback: r.feedback,
        at: `2026-01-0${i + 1}T00:00:00Z`,
      });
    }
    expect(detectIntelligencePlateau(snap, "manage-tantrums", 35)).toBe(true);
  });

  it("renderCoachIntelligencePromptBlock never exposes scores", () => {
    let snap = createEmptyCoachIntelligence();
    snap = applyCoachIntelligenceEvent(snap, {
      type: "win_feedback",
      sessionId: "s1",
      goalId: "manage-tantrums",
      goalTitle: "Tantrums",
      winNumber: 1,
      winTitle: "Small practical step",
      feedback: "yes",
    });
    const block = renderCoachIntelligencePromptBlock(snap, "manage-tantrums");
    expect(block.toLowerCase()).not.toContain("score:");
    expect(block.toLowerCase()).not.toContain("effectiveness");
    expect(block).toContain("FAMILY COACHING CONTEXT");
  });
});
