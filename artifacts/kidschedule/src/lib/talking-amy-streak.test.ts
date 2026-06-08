import { beforeEach, describe, expect, it } from "vitest";
import {
  getStreakMilestoneMessage,
  loadTalkingAmyStreak,
  recordTalkingAmyVisit,
} from "./talking-amy-streak";

describe("talking-amy-streak", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("marks first use today and builds streak", () => {
    const d = new Date(2026, 5, 10, 10, 0, 0);
    const first = recordTalkingAmyVisit(1, d);
    expect(first.isFirstUseToday).toBe(true);
    expect(first.streakDay).toBe(1);

    const second = recordTalkingAmyVisit(1, d);
    expect(second.isFirstUseToday).toBe(false);

    const nextDay = recordTalkingAmyVisit(1, new Date(2026, 5, 11));
    expect(nextDay.streakDay).toBe(2);
    expect(loadTalkingAmyStreak(1).visitDates).toHaveLength(2);
  });

  it("returns milestone copy", () => {
    expect(getStreakMilestoneMessage(2)).toBe("Welcome back!");
    expect(getStreakMilestoneMessage(7)).toBe("One whole week together!");
    expect(getStreakMilestoneMessage(30)).toContain("Superstar");
  });
});
