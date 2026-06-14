import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearNutritionScoreStorage,
  getWeekProgress,
  persistTodayChecklist,
} from "@/features/nutrition/lib/nutrition-score-storage";
import { mergeWeeklyTrendFromServer } from "@/features/nutrition/lib/nutrition-sync";
import { computeLocalMetaForTest } from "@/features/nutrition/lib/nutrition-track-meta.test-utils";

const CHILD_ID = 77;

describe("track source consistency (P1-6)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T12:00:00"));
  });

  afterEach(() => {
    clearNutritionScoreStorage(CHILD_ID);
    vi.useRealTimers();
  });

  it("week strip and trend meta derive from same local store", () => {
    persistTodayChecklist(CHILD_ID, { breakfast: true, protein: true, fruit: true });
    const week = getWeekProgress(CHILD_ID);
    const meta = computeLocalMetaForTest(CHILD_ID);

    const todayWeek = week.find((d) => d.isToday);
    const todayTrend = meta.days.find((d) => d.dateKey === "2026-06-14");

    expect(todayWeek?.status).toBe("partial");
    expect(todayTrend?.checked).toBe(3);
    expect(meta.streak).toBeGreaterThanOrEqual(1);
  });

  it("server merge updates local store used by both strip and meta", async () => {
    const authFetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/weekly-trend")) {
        return new Response(
          JSON.stringify({
            ok: true,
            days: [
              {
                dateKey: "2026-06-13",
                score: 75,
                checked: 3,
                minDayMet: true,
                checklist: { breakfast: true, fruit: true, water: true },
                updatedAt: "2026-06-13T20:00:00.000Z",
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ ok: true }), { status: 404 });
    });

    await mergeWeeklyTrendFromServer(CHILD_ID, authFetch);

    const week = getWeekProgress(CHILD_ID);
    const meta = computeLocalMetaForTest(CHILD_ID);
    const wed = week.find((d) => d.dateKey === "2026-06-13");
    const wedTrend = meta.days.find((d) => d.dateKey === "2026-06-13");

    expect(wed?.status).toBe("partial");
    expect(wedTrend?.checked).toBe(3);
    expect(wedTrend?.score).toBe(38);
  });
});
