import { describe, expect, it } from "vitest";
import { assignAbVariant } from "./content";
import { buildCampaignSchedule, milestoneNotificationId } from "./schedule";

describe("pre-signup schedule", () => {
  it("assigns stable A/B/C variant from device id", () => {
    expect(assignAbVariant("device-a")).toMatch(/^[ABC]$/);
    expect(assignAbVariant("device-a")).toBe(assignAbVariant("device-a"));
  });

  it("schedules five milestones with quiet-hour and daily-cap adjustments", () => {
    const installAt = new Date("2026-06-10T12:00:00").getTime();
    const firstOpen = new Date("2026-06-10T12:05:00").getTime();
    const now = new Date("2026-06-10T12:00:00").getTime();

    const scheduled = buildCampaignSchedule({
      installAtMs: installAt,
      firstOpenAtMs: firstOpen,
      variant: "A",
      nowMs: now,
    });

    expect(scheduled).toHaveLength(5);
    expect(scheduled.map((s) => s.milestone)).toEqual([
      "day0_2h",
      "day1",
      "day2",
      "day4",
      "day7",
    ]);
    expect(scheduled[0]?.deepLink).toBe("/sign-up");
    expect(scheduled.every((s) => s.fireAtMs > now)).toBe(true);
  });

  it("uses stable OS notification ids per milestone", () => {
    expect(milestoneNotificationId("day0_2h")).toBe(910001);
    expect(milestoneNotificationId("day7")).toBe(910005);
  });
});
