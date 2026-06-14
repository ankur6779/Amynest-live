import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLegacyNutritionScoreStorage,
  clearNutritionScoreStorage,
  isServerMigrated,
  LEGACY_NUTRITION_SCORE_KEY,
  mergeLegacyIntoStore,
  persistTodayChecklist,
} from "@/features/nutrition/lib/nutrition-score-storage";
import { hydrateNutritionScore } from "@/features/nutrition/lib/nutrition-sync";

const CHILD_ID = 7;

describe("nutrition-sync migration", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T12:00:00"));
  });

  afterEach(() => {
    clearNutritionScoreStorage(CHILD_ID);
    clearLegacyNutritionScoreStorage();
    vi.useRealTimers();
  });

  it("merges legacy localStorage before server hydrate", async () => {
    localStorage.setItem(
      LEGACY_NUTRITION_SCORE_KEY,
      JSON.stringify({
        version: 1,
        dateKey: "2026-06-14",
        checklist: { breakfast: true, fruit: true, water: true },
        history: {},
      }),
    );

    const puts: Array<{ dateKey: string; checklist: Record<string, boolean> }> = [];

    const authFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/daily-score") && init?.method === "PUT") {
        const body = JSON.parse(String(init.body)) as {
          dateKey: string;
          checklist: Record<string, boolean>;
        };
        puts.push({ dateKey: body.dateKey, checklist: body.checklist });
        return new Response(JSON.stringify({ ok: true, log: body }), { status: 200 });
      }
      if (url.includes("/daily-score") && !init?.method) {
        return new Response(JSON.stringify({ ok: true, log: null }), { status: 200 });
      }
      if (url.includes("/weekly-trend")) {
        return new Response(JSON.stringify({ ok: true, days: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 404 });
    });

    mergeLegacyIntoStore(CHILD_ID);
    await hydrateNutritionScore(CHILD_ID, authFetch);

    expect(isServerMigrated(CHILD_ID)).toBe(true);
    expect(puts.some((p) => p.dateKey === "2026-06-14" && p.checklist.breakfast)).toBe(true);
  });

  it("enqueue path persists today checklist to server on flush", async () => {
    persistTodayChecklist(CHILD_ID, { breakfast: true, protein: true });

    const authFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/daily-score") && init?.method === "PUT") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true, log: null }), { status: 200 });
    });

    const { flushNutritionSync, configureNutritionSync, enqueueNutritionSync } = await import(
      "@/features/nutrition/lib/nutrition-sync"
    );
    configureNutritionSync(authFetch);
    enqueueNutritionSync(CHILD_ID);
    const ok = await flushNutritionSync(CHILD_ID);
    expect(ok).toBe(true);
    expect(authFetch).toHaveBeenCalled();
  });
});
