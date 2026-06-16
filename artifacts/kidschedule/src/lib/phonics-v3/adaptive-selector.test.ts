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

function seededMastery() {
  let mastery = defaultMasteryState();
  mastery = recordMasteryEvent(mastery, "word", "cat", "heard");
  mastery = recordMasteryEvent(mastery, "word", "hat", "heard");
  mastery = recordMasteryEvent(mastery, "word", "dog", "heard");
  return mastery;
}

const seededProgress = {
  practiced: { "1": 2, "2": 1, "3": 1 },
  mastered: {},
};

describe("adaptive-selector", () => {
  it("allocates 70/20/10 lesson mix", () => {
    const mastery = seededMastery();
    const picks = selectAdaptiveLessons({
      childId: 42,
      dateKey: "2026-06-11",
      mastery,
      items,
      progress: seededProgress,
      totalCount: 10,
      currentLevel: 2,
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
      progress: seededProgress,
      mastery: seededMastery(),
      streakDay: 3,
      curriculumLevel: 2,
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
      currentLevel: 2,
    });
    expect(picks.filter((p) => p.reason === "overdue").length).toBeGreaterThan(0);
    expect(picks.filter((p) => p.reason === "new").length).toBe(0);
  });
});
