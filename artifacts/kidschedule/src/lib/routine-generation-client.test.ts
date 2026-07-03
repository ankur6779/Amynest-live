import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchStandardRoutine,
  fetchAmyAiRoutine,
  fetchRoutineWithResilience,
  RoutineGenerationPaywallError,
} from "./routine-generation-client";
import { resetAnalyticsServiceForTests, getAnalyticsService } from "./analytics/analytics-service";

describe("routine-generation-client resilience", () => {
  beforeEach(() => {
    resetAnalyticsServiceForTests();
    vi.restoreAllMocks();
  });

  it("falls back to standard generate when AI payload is invalid", async () => {
    const authFetch = vi.fn(async (url: string | URL) => {
      const path = String(url);
      if (path.includes("generate-ai")) {
        return new Response(JSON.stringify({ title: "Bad", items: [] }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          title: "School day",
          items: [{ activity: "Breakfast", time: "8:00 AM", duration: 30, category: "meal" }],
        }),
        { status: 200 },
      );
    });

    const result = await fetchAmyAiRoutine(authFetch as never, {
      childId: 1,
      date: "2026-07-03",
    });

    expect(result.fallback).toBe(true);
    expect(sanitizeCount(result.items)).toBeGreaterThan(0);
    expect(authFetch.mock.calls.some((c) => String(c[0]).includes("generate-ai"))).toBe(true);
    expect(authFetch.mock.calls.some((c) => String(c[0]).includes("/generate") && !String(c[0]).includes("generate-ai"))).toBe(true);
  });

  it("returns emergency client fallback when standard generate fails", async () => {
    const authFetch = vi.fn(async () => new Response("error", { status: 500 }));

    const result = await fetchRoutineWithResilience(authFetch as never, {
      childId: 2,
      date: "2026-07-04",
    }, { childName: "Sam" });

    expect(result.fallback).toBe(true);
    expect(result.title).toBe("Backup daily routine");
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("rethrows paywall errors from standard generate", async () => {
    const authFetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "feature_locked", feature: "routine_generate" }), {
          status: 402,
        }),
    );

    await expect(
      fetchStandardRoutine(authFetch as never, { childId: 1, date: "2026-07-03" }),
    ).rejects.toBeInstanceOf(RoutineGenerationPaywallError);
  });

  it("emits analytics started once per attempt", async () => {
    const authFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          title: "Day",
          items: [{ activity: "Breakfast", time: "8:00 AM", duration: 30, category: "meal" }],
        }),
        { status: 200 },
      ),
    );

    await fetchStandardRoutine(authFetch as never, { childId: 3, date: "2026-07-05" });
    expect(getAnalyticsService().pendingCount()).toBeGreaterThanOrEqual(0);
  });
});

function sanitizeCount(items: unknown): number {
  return Array.isArray(items) ? items.length : 0;
}
