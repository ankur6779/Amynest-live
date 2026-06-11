import { describe, expect, it } from "vitest";
import {
  INTEGRITY_LIMITS,
  applyGatedWordMastery,
  defaultIntegrityState,
  evaluateMasteryAttempt,
  isWordMasteredViaExploit,
  maxWordScoreAfterExploit,
} from "./mastery-integrity";
import {
  defaultMasteryState,
  isTrulyMastered,
  MASTERY_THRESHOLDS,
  recordMasteryEvent,
} from "./mastery-engine";

const START = Date.UTC(2026, 0, 1);

describe("mastery-integrity certification", () => {
  it("hard-caps dimension counts — 50 taps cannot exceed threshold", () => {
    let state = defaultMasteryState();
    for (let i = 0; i < 50; i++) {
      state = recordMasteryEvent(state, "word", "cat", "heard");
    }
    expect(state.words.cat?.counts.heard).toBe(MASTERY_THRESHOLDS.heard);
    expect(isTrulyMastered(state.words.cat!.counts, state.words.cat!.score)).toBe(false);
  });

  it("blocks 100 rapid karaoke replays from reaching mastered", () => {
    let mastery = defaultMasteryState();
    let integrity = defaultIntegrityState(START);

    for (let i = 0; i < 100; i++) {
      const result = applyGatedWordMastery({
        mastery,
        integrity,
        word: "cat",
        dimension: "blended",
        activity: "karaoke",
        passed: true,
        accuracy: 1,
        attemptNumber: i + 1,
        now: START + i * 50,
      });
      mastery = result.mastery;
      integrity = result.integrity;
    }

    expect(mastery.words.cat?.counts.blended ?? 0).toBeLessThanOrEqual(MASTERY_THRESHOLDS.blended);
    expect(isWordMasteredViaExploit(mastery, "cat")).toBe(false);
    expect(maxWordScoreAfterExploit(mastery, "cat")).toBeLessThan(90);
  });

  it("replay cooldown gives zero credit within short window", () => {
    let mastery = defaultMasteryState();
    let integrity = defaultIntegrityState(START);

    const first = applyGatedWordMastery({
      mastery,
      integrity,
      word: "hat",
      dimension: "blended",
      activity: "karaoke",
      passed: true,
      accuracy: 1,
      attemptNumber: 1,
      now: START,
    });
    mastery = first.mastery;
    integrity = first.integrity;
    expect(first.verdict.appliesMastery).toBe(true);

    const second = applyGatedWordMastery({
      mastery,
      integrity,
      word: "hat",
      dimension: "blended",
      activity: "karaoke",
      passed: true,
      accuracy: 1,
      attemptNumber: 2,
      now: START + 5_000,
    });
    expect(second.verdict.appliesMastery).toBe(false);
    expect(second.verdict.blockReason).toBe("replay-cooldown");
    expect(second.mastery.words.hat?.counts.blended).toBe(first.mastery.words.hat?.counts.blended);
  });

  it("karaoke completion alone is insufficient without accuracy threshold", () => {
    let integrity = defaultIntegrityState(START);
    const mastery = defaultMasteryState();

    const lowAccuracy = evaluateMasteryAttempt(integrity, mastery, {
      activity: "karaoke",
      targetType: "word",
      targetId: "dog",
      dimension: "blended",
      passed: true,
      accuracy: 0.4,
      now: START,
    });
    expect(lowAccuracy.verdict.appliesMastery).toBe(false);
    expect(lowAccuracy.verdict.blockReason).toBe("karaoke-accuracy-below-threshold");
  });

  it("weights first-attempt success higher than repeated guesses", () => {
    let integrity = defaultIntegrityState(START);
    const mastery = defaultMasteryState();

    const first = evaluateMasteryAttempt(integrity, mastery, {
      activity: "voice",
      targetType: "word",
      targetId: "pin",
      dimension: "spoken",
      passed: true,
      confidence: 0.9,
      attemptNumber: 1,
      now: START,
    });
    const second = evaluateMasteryAttempt(first.integrity, mastery, {
      activity: "voice",
      targetType: "word",
      targetId: "pin",
      dimension: "spoken",
      passed: true,
      confidence: 0.9,
      attemptNumber: 2,
      now: START + INTEGRITY_LIMITS.REPLAY_COOLDOWN_MS + 1,
    });

    expect(first.verdict.creditWeight).toBeGreaterThan(second.verdict.creditWeight);
  });

  it("applies mistake penalties on repeated incorrect answers", () => {
    let integrity = defaultIntegrityState(START);
    const mastery = defaultMasteryState();

    for (let i = 0; i < 5; i++) {
      const result = evaluateMasteryAttempt(integrity, mastery, {
        activity: "voice",
        targetType: "word",
        targetId: "ship",
        dimension: "spoken",
        passed: false,
        confidence: 0.2,
        attemptNumber: i + 1,
        now: START + i * 60_000,
      });
      integrity = result.integrity;
    }

    expect(integrity.confidenceScores.ship).toBeLessThan(50);
    expect(integrity.mistakeCounts.ship).toBe(5);
  });

  it("detects rapid tap spam and blocks mastery credit burst", () => {
    let integrity = defaultIntegrityState(START);
    const mastery = defaultMasteryState();
    let blocked = 0;

    for (let i = 0; i < 20; i++) {
      const result = evaluateMasteryAttempt(integrity, mastery, {
        activity: "family_practice",
        targetType: "word",
        targetId: "chip",
        dimension: "heard",
        passed: true,
        now: START + i * 100,
      });
      integrity = result.integrity;
      if (result.verdict.blockReason === "spam-burst") blocked += 1;
    }

    expect(blocked).toBeGreaterThan(0);
    expect(integrity.spamBlockedUntil).toBeGreaterThan(START);
  });

  it("cannot reach mastered through exploit simulation across all dimensions", () => {
    let mastery = defaultMasteryState();
    let integrity = defaultIntegrityState(START);
    const dimensions = ["heard", "blended", "identified", "spoken"] as const;

    for (const dimension of dimensions) {
      for (let i = 0; i < 100; i++) {
        const activity =
          dimension === "blended"
            ? "karaoke"
            : dimension === "spoken"
              ? "voice"
              : "family_practice";
        const result = applyGatedWordMastery({
          mastery,
          integrity,
          word: "cat",
          dimension,
          activity,
          passed: true,
          accuracy: dimension === "blended" ? 1 : undefined,
          confidence: dimension === "spoken" ? 0.95 : undefined,
          attemptNumber: i + 1,
          now: START + i * 30,
        });
        mastery = result.mastery;
        integrity = result.integrity;
      }
    }

    const rec = mastery.words.cat;
    expect(rec?.counts.heard ?? 0).toBeLessThanOrEqual(MASTERY_THRESHOLDS.heard);
    expect(rec?.counts.blended ?? 0).toBeLessThanOrEqual(MASTERY_THRESHOLDS.blended);
    expect(rec?.counts.identified ?? 0).toBeLessThanOrEqual(MASTERY_THRESHOLDS.identified);
    expect(rec?.counts.spoken ?? 0).toBeLessThanOrEqual(MASTERY_THRESHOLDS.spoken);
    expect(isWordMasteredViaExploit(mastery, "cat")).toBe(false);
  });

  it("repeated voice retries without passing earn no spoken credit", () => {
    let mastery = defaultMasteryState();
    let integrity = defaultIntegrityState(START);

    for (let i = 0; i < 50; i++) {
      const result = applyGatedWordMastery({
        mastery,
        integrity,
        word: "dog",
        dimension: "spoken",
        activity: "voice",
        passed: false,
        confidence: 0.2,
        attemptNumber: i + 1,
        now: START + i * 60_000,
      });
      mastery = result.mastery;
      integrity = result.integrity;
    }

    expect(mastery.words.dog?.counts.spoken ?? 0).toBe(0);
    expect(integrity.confidenceScores.dog ?? 50).toBeLessThan(20);
  });
});
