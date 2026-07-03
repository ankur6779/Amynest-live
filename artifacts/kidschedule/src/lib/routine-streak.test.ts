import { describe, expect, it } from "vitest";
import { computeRoutineStreak } from "./routine-streak";

describe("computeRoutineStreak", () => {
  it("counts consecutive days ending today", () => {
    const today = new Date("2026-07-03T12:00:00");
    const routines = [
      { date: "2026-07-03" },
      { date: "2026-07-02" },
      { date: "2026-07-01" },
    ];
    expect(computeRoutineStreak(routines, today)).toBe(3);
  });

  it("applies same-day grace when today has no routine yet", () => {
    const today = new Date("2026-07-03T12:00:00");
    const routines = [{ date: "2026-07-02" }, { date: "2026-07-01" }];
    expect(computeRoutineStreak(routines, today)).toBe(2);
  });

  it("returns zero when no recent routines", () => {
    const today = new Date("2026-07-03T12:00:00");
    expect(computeRoutineStreak([{ date: "2026-06-01" }], today)).toBe(0);
  });
});
