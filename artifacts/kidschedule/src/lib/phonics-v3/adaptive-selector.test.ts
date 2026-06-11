import { describe, expect, it } from "vitest";
import { buildAdaptiveDailyMission, selectAdaptiveLessons } from "./adaptive-selector";
import { defaultMasteryState, recordMasteryEvent } from "./mastery-engine";
import {
  daysToMs,
  defaultRetentionState,
  introduceSkill,
  recordReviewOutcome,
} from "./spaced-repetition";

const items = [
  { id: "1", symbol: "cat", type: "word" as const, contentId: 1 },
  { id: "2", symbol: "hat", type: "word" as const, contentId: 2 },
  { id: "3", symbol: "dog", type: "word" as const, contentId: 3 },
];

describe("adaptive-selector", () => {
  it("allocates 70/20/10 lesson mix", () => {
    let mastery = defaultMasteryState();
    mastery = recordMasteryEvent(mastery, "word", "cat", "heard");
    const picks = selectAdaptiveLessons({
      childId: 42,
      dateKey: "2026-06-11",
      mastery,
      items,
      progress: { practiced: {}, mastered: {} },
      totalCount: 10,
    });
    const weak = picks.filter((p) => p.reason === "weak").length;
    const review = picks.filter((p) => p.reason === "review").length;
    const neu = picks.filter((p) => p.reason === "new").length;
    expect(weak + review + neu).toBe(10);
    expect(weak).toBeGreaterThanOrEqual(review);
    expect(weak).toBeGreaterThanOrEqual(neu);
  });

  it("builds adaptive daily mission tasks", () => {
    const mission = buildAdaptiveDailyMission({
      childId: 1,
      items,
      progress: { practiced: {}, mastered: {} },
      mastery: defaultMasteryState(),
      streakDay: 3,
    });
    expect(mission.tasks.length).toBeGreaterThan(0);
    expect(mission.adaptivePicks.length).toBe(6);
  });

  it("prioritizes overdue retention reviews over new words", () => {
    const now = Date.UTC(2026, 5, 11);
    let retention = introduceSkill(defaultRetentionState(), "word", "cat", now - daysToMs(4));
    retention = recordReviewOutcome(retention, "word", "cat", false, now - daysToMs(3));
    const picks = selectAdaptiveLessons({
      childId: 1,
      dateKey: "2026-06-11",
      mastery: defaultMasteryState(),
      items,
      progress: { practiced: {}, mastered: {} },
      retention,
      totalCount: 6,
      now,
    });
    expect(picks.filter((p) => p.reason === "overdue").length).toBeGreaterThan(0);
    expect(picks.filter((p) => p.reason === "new").length).toBe(0);
  });
});
