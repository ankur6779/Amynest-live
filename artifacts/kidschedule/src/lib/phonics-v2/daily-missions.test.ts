import { describe, expect, it } from "vitest";
import { buildDailyReadingMission, completeMissionTask } from "./daily-missions";
import type { DisplayPhonicsItem, PhonicsProgressMap } from "@/hooks/use-phonics-data";

const items: DisplayPhonicsItem[] = [
  { id: "1", symbol: "cat", type: "word", sound: "cat" },
  { id: "2", symbol: "hat", type: "word", sound: "hat" },
  { id: "3", symbol: "dog", type: "word", sound: "dog" },
];

const emptyProgress: PhonicsProgressMap = { practiced: {}, mastered: {} };

describe("daily-missions", () => {
  it("builds mission with review, practice, new, challenge, story slots", () => {
    const mission = buildDailyReadingMission({
      childId: 42,
      items,
      progress: emptyProgress,
    });
    expect(mission.tasks.length).toBeGreaterThanOrEqual(5);
    expect(mission.tasks.some((t) => t.slot === "review")).toBe(true);
    expect(mission.tasks.some((t) => t.slot === "challenge")).toBe(true);
    expect(mission.tasks.some((t) => t.slot === "story")).toBe(true);
    expect(mission.estimatedMinutes).toBeGreaterThanOrEqual(3);
  });

  it("marks task complete without dropping other tasks", () => {
    const mission = buildDailyReadingMission({
      childId: 1,
      items,
      progress: emptyProgress,
    });
    const first = mission.tasks[0]!;
    const next = completeMissionTask(mission, first.id);
    expect(next.tasks.find((t) => t.id === first.id)?.completed).toBe(true);
    expect(next.completed).toBe(false);
  });
});
