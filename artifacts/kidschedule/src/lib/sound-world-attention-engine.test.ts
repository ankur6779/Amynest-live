import { describe, expect, it } from "vitest";
import {
  ATTENTION_LABELS,
  buildAdaptiveProfile,
  buildAttentionSnapshot,
  classifyAttention,
  computeAttentionScore,
  computeAttentionSignals,
  createAttentionSession,
  detectSessionRhythm,
  reduceAttentionEvent,
} from "./sound-world-attention-engine";

function run(events: Array<Parameters<typeof reduceAttentionEvent>[1]["type"]>, childId = 1) {
  let state = createAttentionSession(childId, 1_000_000);
  let t = 1_000_000;
  for (const type of events) {
    t += 1_200;
    state = reduceAttentionEvent(state, { type, at: t, itemId: type === "object_open" ? "cow" : undefined });
  }
  return buildAttentionSnapshot(state, t + 500);
}

describe("sound-world-attention-engine", () => {
  it("creates a session with neutral baseline score band", () => {
    const state = createAttentionSession(9, 1000);
    const snap = buildAttentionSnapshot(state, 1000);
    expect(snap.score).toBeGreaterThanOrEqual(45);
    expect(snap.score).toBeLessThanOrEqual(65);
    expect(snap.classification).toBe("neutral");
    expect(ATTENTION_LABELS[snap.classification]).toBe("Neutral");
  });

  it("raises score for focused object interaction and correct answers", () => {
    const focused = run([
      "session_start",
      "object_open",
      "answer_correct",
      "object_open",
      "answer_correct",
      "replay",
      "task_complete",
    ]);
    expect(focused.score).toBeGreaterThan(60);
    expect(["focused", "highly_focused", "neutral"]).toContain(focused.classification);
  });

  it("classifies distracted when rapid skips and idle dominate", () => {
    let state = createAttentionSession(2, 0);
    state = reduceAttentionEvent(state, { type: "session_start", at: 0 });
    state = reduceAttentionEvent(state, { type: "idle_sample", at: 5_000, idleMs: 20_000 });
    for (let i = 0; i < 6; i++) {
      state = reduceAttentionEvent(state, { type: "rapid_skip", at: 6_000 + i * 400 });
      state = reduceAttentionEvent(state, { type: "navigate", at: 6_200 + i * 400 });
    }
    const signals = computeAttentionSignals(state, 12_000);
    const score = computeAttentionScore(signals);
    const classification = classifyAttention(score, signals);
    expect(classification).toBe("distracted");
    const adaptive = buildAdaptiveProfile(classification, "drop_off");
    expect(adaptive.visualComplexity).toBe("reduced");
    expect(adaptive.encouragement).toBe(true);
    expect(adaptive.quizOptionCount).toBe(2);
  });

  it("classifies fatigued on long session with struggle", () => {
    let state = createAttentionSession(3, 0);
    state = reduceAttentionEvent(state, { type: "session_start", at: 0 });
    // Simulate ~14 minutes elapsed via idle + low activity
    state = {
      ...state,
      counters: {
        ...state.counters,
        idleMsTotal: 400_000,
        activeMsEstimate: 200_000,
        incorrect: 5,
        incorrectStreak: 4,
        maxIncorrectStreak: 4,
        interactions: 8,
        rapidSkips: 3,
      },
    };
    const now = 14 * 60_000;
    const signals = computeAttentionSignals(state, now);
    expect(signals.sessionMinutes).toBeGreaterThan(12);
    const classification = classifyAttention(computeAttentionScore(signals), signals);
    expect(classification).toBe("fatigued");
    const adaptive = buildAdaptiveProfile(classification, "drop_off");
    expect(adaptive.suggestRelaxWorld).toBe(true);
    expect(adaptive.suggestBreak).toBe(true);
    expect(adaptive.animationIntensity).toBe("minimal");
  });

  it("detects completion rhythm after task_complete", () => {
    const snap = run(["session_start", "object_open", "task_complete"]);
    expect(snap.rhythm).toBe("completion");
    expect(detectSessionRhythm(
      reduceAttentionEvent(createAttentionSession(1, 0), { type: "task_complete", at: 100 }),
      50,
      200,
    )).toBe("completion");
  });

  it("highly focused adaptive offers bonus challenge", () => {
    const adaptive = buildAdaptiveProfile("highly_focused", "peak_engagement");
    expect(adaptive.offerBonusTask).toBe(true);
    expect(adaptive.offerExploration).toBe(true);
    expect(adaptive.quizOptionCount).toBe(4);
    expect(adaptive.taskDifficulty).toBe("harder");
  });

  it("never requires cloud or PII fields in snapshot", () => {
    const snap = run(["session_start", "pointer_activity"]);
    expect(snap).toHaveProperty("score");
    expect(snap).toHaveProperty("classification");
    expect(snap).toHaveProperty("rhythm");
    expect(snap).toHaveProperty("adaptive");
    expect(JSON.stringify(snap)).not.toMatch(/email|name|phone|camera|microphone/i);
  });
});
