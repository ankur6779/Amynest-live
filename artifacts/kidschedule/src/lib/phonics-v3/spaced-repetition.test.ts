import { describe, expect, it } from "vitest";
import {
  REVIEW_INTERVALS_DAYS,
  advanceReviewStage,
  applyMasteryDecay,
  computeRetentionPct,
  daysToMs,
  defaultRetentionState,
  introduceSkill,
  isReviewDue,
  recordReviewOutcome,
  regressReviewStage,
  simulateRetention90Days,
  syncMasteredTracks,
} from "./spaced-repetition";
import {
  defaultMasteryState,
  recordMasteryEvent,
} from "./mastery-engine";
import { buildAdaptiveDailyMission } from "./adaptive-selector";

function buildMasteredWord(word: string) {
  let mastery = defaultMasteryState();
  for (let i = 0; i < 3; i++) {
    mastery = recordMasteryEvent(mastery, "word", word, "heard");
    mastery = recordMasteryEvent(mastery, "word", word, "blended");
    mastery = recordMasteryEvent(mastery, "word", word, "identified");
  }
  for (let i = 0; i < 2; i++) {
    mastery = recordMasteryEvent(mastery, "word", word, "spoken");
  }
  return mastery;
}

describe("spaced-repetition", () => {
  it("defines review intervals 1d, 3d, 7d, 14d, 30d", () => {
    expect(REVIEW_INTERVALS_DAYS[1]).toBe(1);
    expect(REVIEW_INTERVALS_DAYS[2]).toBe(3);
    expect(REVIEW_INTERVALS_DAYS[3]).toBe(7);
    expect(REVIEW_INTERVALS_DAYS[4]).toBe(14);
    expect(REVIEW_INTERVALS_DAYS[5]).toBe(30);
  });

  it("schedules stage 1 review on day 1 after introduction", () => {
    const now = Date.UTC(2026, 0, 1);
    const state = introduceSkill(defaultRetentionState(), "word", "cat", now);
    const track = state.tracks["word:cat"]!;
    expect(track.reviewStage).toBe(1);
    expect(track.nextReviewAt).toBe(now + daysToMs(1));
    expect(isReviewDue(track, now)).toBe(false);
    expect(isReviewDue(track, now + daysToMs(1))).toBe(true);
  });

  it("advances stage on passed review", () => {
    const now = Date.UTC(2026, 0, 1);
    let state = introduceSkill(defaultRetentionState(), "word", "hat", now);
    state = recordReviewOutcome(state, "word", "hat", true, now + daysToMs(1));
    const track = state.tracks["word:hat"]!;
    expect(track.reviewStage).toBe(2);
    expect(advanceReviewStage(2)).toBe(3);
    expect(track.nextReviewAt).toBe(now + daysToMs(1) + daysToMs(3));
    expect(track.retentionScore).toBeGreaterThan(50);
  });

  it("regresses stage on failed review", () => {
    const now = Date.UTC(2026, 0, 1);
    let state = introduceSkill(defaultRetentionState(), "word", "dog", now);
    state = recordReviewOutcome(state, "word", "dog", true, now + daysToMs(1));
    state = recordReviewOutcome(state, "word", "dog", false, now + daysToMs(5));
    const track = state.tracks["word:dog"]!;
    expect(track.reviewStage).toBe(1);
    expect(regressReviewStage(3)).toBe(2);
    expect(track.retentionScore).toBeLessThan(62);
  });

  it("decays mastered band after repeated failed reviews", () => {
    const mastery = buildMasteredWord("pin");
    expect(mastery.words.pin?.isMastered).toBe(true);

    const now = Date.UTC(2026, 0, 1);
    let retention = introduceSkill(defaultRetentionState(), "word", "pin", now);
    retention = recordReviewOutcome(retention, "word", "pin", false, now + daysToMs(1));
    let decayed = applyMasteryDecay(mastery, retention);
    expect(decayed.decayedSkills).toHaveLength(0);

    retention = recordReviewOutcome(retention, "word", "pin", false, now + daysToMs(2));
    decayed = applyMasteryDecay(mastery, retention);
    expect(decayed.decayedSkills).toContain("pin");
    expect(decayed.mastery.words.pin?.band).toBe("strong");
    expect(decayed.mastery.words.pin?.isMastered).toBe(false);

    retention = recordReviewOutcome(retention, "word", "pin", false, now + daysToMs(3));
    retention = recordReviewOutcome(retention, "word", "pin", false, now + daysToMs(4));
    decayed = applyMasteryDecay(mastery, retention);
    expect(decayed.mastery.words.pin?.band).toBe("practicing");
  });

  it("ensures mastered skills always have review tracks", () => {
    const mastery = buildMasteredWord("ship");
    const now = Date.UTC(2026, 0, 1);
    const retention = syncMasteredTracks(defaultRetentionState(), mastery, now);
    const track = retention.tracks["word:ship"];
    expect(track).toBeDefined();
    expect(track!.nextReviewAt).toBeLessThanOrEqual(now + daysToMs(30));
  });

  it("90-day simulation with reviews improves retention vs passive baseline", () => {
    const skills = ["cat", "hat", "dog"];
    const start = Date.UTC(2026, 0, 1);
    const mastery = buildMasteredWord("cat");

    const active = simulateRetention90Days({
      initialRetention: defaultRetentionState(),
      initialMastery: mastery,
      skillIds: skills,
      startMs: start,
      dailyPassRate: () => true,
    });

    let passive = defaultRetentionState();
    for (const id of skills) {
      passive = introduceSkill(passive, "word", id, start);
    }
    const passivePct = computeRetentionPct(passive);

    expect(active.retentionPct).toBeGreaterThan(passivePct);
    expect(active.retentionPct).toBeGreaterThanOrEqual(60);
  });

  it("daily missions prioritize overdue reviews before new skills", () => {
    const now = Date.UTC(2026, 0, 10);
    let retention = introduceSkill(defaultRetentionState(), "word", "cat", now - daysToMs(5));
    retention = recordReviewOutcome(retention, "word", "cat", false, now - daysToMs(4));
    const items = [
      { id: "1", symbol: "cat", type: "word" as const, contentId: 1 },
      { id: "2", symbol: "hat", type: "word" as const, contentId: 2 },
      { id: "3", symbol: "dog", type: "word" as const, contentId: 3 },
    ];
    const mission = buildAdaptiveDailyMission({
      childId: 7,
      items,
      progress: { practiced: {}, mastered: {} },
      mastery: defaultMasteryState(),
      retention,
      streakDay: 1,
      now,
    });
    const overdueTasks = mission.tasks.filter((t) => t.label.startsWith("Overdue:"));
    const newTasks = mission.tasks.filter((t) => t.label.startsWith("New:"));
    expect(overdueTasks.length).toBeGreaterThan(0);
    expect(newTasks.length).toBe(0);
    expect(mission.adaptivePicks.some((p) => p.reason === "overdue")).toBe(true);
  });
});
