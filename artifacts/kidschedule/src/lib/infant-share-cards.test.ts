import { describe, expect, it } from "vitest";
import {
  buildWeeklyShareCardData,
  computeWeeklySleepScore,
  formatGrowthStatus,
  formatVaccineStatus,
  getWeekEndingDateLabel,
  getWeeklyAchievedMilestoneIds,
} from "@/lib/infant-share-cards";

describe("infant-share-cards", () => {
  it("computes weekly sleep score in 0–100 range", () => {
    expect(computeWeeklySleepScore(14, 98, 3)).toBeGreaterThan(80);
    expect(computeWeeklySleepScore(0, 0, 3)).toBeLessThan(20);
  });

  it("formats growth and vaccine status labels", () => {
    const recent = [{ measuredAt: new Date().toISOString() }];
    expect(formatGrowthStatus(recent)).toBe("On Track");
    expect(formatGrowthStatus([])).toBe("Add measurement");
    expect(formatVaccineStatus({ pending: 0, missed: 0 })).toBe("Up To Date");
    expect(formatVaccineStatus({ pending: 2, missed: 0 })).toBe("2 due");
  });

  it("builds weekly card data from doctor report payload", () => {
    const data = buildWeeklyShareCardData(
      "Emma",
      {
        child: { ageMonths: 4 },
        sleep: { sessionsLast7Days: 12, totalSleepHours: 90 },
        feeding: { logsLast7Days: 32 },
        growth: [{ measuredAt: new Date().toISOString() }],
        vaccines: { pending: 0, missed: 0 },
      },
      ["Rolled Over"],
      1,
    );
    expect(data.childFirstName).toBe("Emma");
    expect(data.feedCount).toBe(32);
    expect(data.newMilestones).toEqual(["Rolled Over"]);
    expect(data.weekEndingDate).toBe(getWeekEndingDateLabel());
  });

  it("filters milestones achieved in the last 7 days", () => {
    const now = Date.now();
    const titles = getWeeklyAchievedMilestoneIds(
      {
        a: { state: "achieved", updatedAt: now - 2 * 24 * 60 * 60_000 },
        b: { state: "achieved", updatedAt: now - 10 * 24 * 60 * 60_000 },
        c: { state: "in_progress", updatedAt: now },
      },
      (id) => (id === "a" ? "Rolled Over" : id),
    );
    expect(titles).toEqual(["Rolled Over"]);
  });
});
