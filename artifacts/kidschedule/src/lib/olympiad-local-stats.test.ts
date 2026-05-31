import { describe, it, expect } from "vitest";
import {
  computeDailyStreak,
  freshOlympiadStats,
  appendDailyHistory,
  todayISO,
  yesterdayISO,
  dayBeforeYesterdayISO,
} from "./olympiad-local-stats";
import {
  olympiadRankForPoints,
  nextRankProgress,
  subjectMasteryRingPct,
  weakestSubjects,
} from "@workspace/olympiad";

describe("olympiad-local-stats", () => {
  it("computeDailyStreak increments on consecutive days", () => {
    const stats = { ...freshOlympiadStats(), streak: 3, lastDailyDate: yesterdayISO() };
    const r = computeDailyStreak(stats, todayISO());
    expect(r.streak).toBe(4);
    expect(r.usedFreeze).toBe(false);
  });

  it("computeDailyStreak uses freeze when one day missed", () => {
    const stats = {
      ...freshOlympiadStats(),
      streak: 5,
      lastDailyDate: dayBeforeYesterdayISO(),
      streakFreezesUsedThisWeek: 0,
      streakFreezeWeekStart: null,
    };
    const r = computeDailyStreak(stats, todayISO());
    expect(r.streak).toBe(6);
    expect(r.usedFreeze).toBe(true);
  });

  it("appendDailyHistory keeps last 30 entries", () => {
    const base = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      score: 3,
      total: 5,
      accuracyPct: 60,
    }));
    const next = appendDailyHistory(base, {
      date: todayISO(),
      score: 5,
      total: 5,
      accuracyPct: 100,
    });
    expect(next.length).toBe(30);
    expect(next[next.length - 1]?.score).toBe(5);
  });
});

describe("olympiad gamification lib", () => {
  it("rank tiers by points", () => {
    expect(olympiadRankForPoints(0).id).toBe("bronze");
    expect(olympiadRankForPoints(150).id).toBe("silver");
    expect(olympiadRankForPoints(600).id).toBe("gold");
    expect(olympiadRankForPoints(1200).id).toBe("champion");
  });

  it("next rank progress", () => {
    const p = nextRankProgress(50);
    expect(p.current.id).toBe("bronze");
    expect(p.next?.id).toBe("silver");
    expect(p.pointsToNext).toBe(50);
  });

  it("weakest subjects by accuracy", () => {
    const weak = weakestSubjects({
      math: { correct: 8, total: 10 },
      science: { correct: 2, total: 10 },
      reasoning: { correct: 5, total: 10 },
      gk: { correct: 1, total: 10 },
    });
    expect(weak).toEqual(["gk", "science"]);
  });
});
