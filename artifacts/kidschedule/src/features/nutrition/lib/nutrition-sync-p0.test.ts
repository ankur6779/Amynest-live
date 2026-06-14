import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLegacyNutritionScoreStorage,
  clearNutritionScoreStorage,
  isServerMigrated,
  LEGACY_NUTRITION_SCORE_KEY,
  mergeLegacyIntoStore,
  persistTodayChecklist,
  readTodayChecklist,
} from "@/features/nutrition/lib/nutrition-score-storage";
import {
  configureNutritionSync,
  enqueueNutritionSync,
  flushNutritionSync,
  hydrateNutritionScore,
  resolveChecklistForSyncDate,
} from "@/features/nutrition/lib/nutrition-sync";

const CHILD_ID = 7;

describe("nutrition-sync P0 regression", () => {
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

  it("does not mark server migrated when upload fails", async () => {
    localStorage.setItem(
      LEGACY_NUTRITION_SCORE_KEY,
      JSON.stringify({
        version: 1,
        dateKey: "2026-06-14",
        checklist: { breakfast: true, fruit: true },
        history: {},
      }),
    );

    const authFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/daily-score") && init?.method === "PUT") {
        return new Response(JSON.stringify({ error: "fail" }), { status: 500 });
      }
      if (String(input).includes("/daily-score")) {
        return new Response(JSON.stringify({ ok: true, log: null }), { status: 200 });
      }
      if (String(input).includes("/weekly-trend")) {
        return new Response(JSON.stringify({ ok: true, days: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 404 });
    });

    mergeLegacyIntoStore(CHILD_ID);
    await hydrateNutritionScore(CHILD_ID, authFetch);

    expect(isServerMigrated(CHILD_ID)).toBe(false);
  });

  it("marks server migrated only after all uploads succeed", async () => {
    localStorage.setItem(
      LEGACY_NUTRITION_SCORE_KEY,
      JSON.stringify({
        version: 1,
        dateKey: "2026-06-14",
        checklist: { breakfast: true, fruit: true },
        history: {},
      }),
    );

    const authFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/daily-score") && init?.method === "PUT") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (String(input).includes("/daily-score")) {
        return new Response(JSON.stringify({ ok: true, log: null }), { status: 200 });
      }
      if (String(input).includes("/weekly-trend")) {
        return new Response(JSON.stringify({ ok: true, days: [] }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 404 });
    });

    mergeLegacyIntoStore(CHILD_ID);
    await hydrateNutritionScore(CHILD_ID, authFetch);

    expect(isServerMigrated(CHILD_ID)).toBe(true);
  });

  it("flush uploads each queued dateKey including non-today history", async () => {
    persistTodayChecklist(CHILD_ID, { breakfast: true, protein: true });
    const store = JSON.parse(localStorage.getItem(`nutrition:daily-score:${CHILD_ID}`)!);
    store.history["2026-06-13"] = { score: 40, checked: 3, total: 8, minDayMet: true };
    store.dayChecklists["2026-06-13"] = { breakfast: true, fruit: true, water: true };
    localStorage.setItem(`nutrition:daily-score:${CHILD_ID}`, JSON.stringify(store));

    const puts: string[] = [];
    const authFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/daily-score") && init?.method === "PUT") {
        const body = JSON.parse(String(init.body)) as { dateKey: string };
        puts.push(body.dateKey);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true, log: null }), { status: 200 });
    });

    configureNutritionSync(authFetch);
    enqueueNutritionSync(CHILD_ID, "2026-06-13");
    enqueueNutritionSync(CHILD_ID, "2026-06-14");

    const ok = await flushNutritionSync(CHILD_ID);
    expect(ok).toBe(true);
    expect(puts).toContain("2026-06-14");
    expect(puts).toContain("2026-06-13");
  });

  it("resolveChecklistForSyncDate reads canonical history for past dates", () => {
    persistTodayChecklist(CHILD_ID, { breakfast: true });
    const raw = JSON.parse(localStorage.getItem(`nutrition:daily-score:${CHILD_ID}`)!);
    raw.history["2026-06-12"] = { score: 50, checked: 4, total: 8, minDayMet: true };
    raw.dayChecklists["2026-06-12"] = { protein: true, dairy: true, fruit: true, water: true };
    localStorage.setItem(`nutrition:daily-score:${CHILD_ID}`, JSON.stringify(raw));

    const checklist = resolveChecklistForSyncDate(CHILD_ID, "2026-06-12");
    expect(checklist).toEqual({ protein: true, dairy: true, fruit: true, water: true });
    expect(readTodayChecklist(CHILD_ID).breakfast).toBe(true);
  });

  it("retains failed queue entries when offline then flushes on retry", async () => {
    persistTodayChecklist(CHILD_ID, { breakfast: true });
    const store = JSON.parse(localStorage.getItem(`nutrition:daily-score:${CHILD_ID}`)!);
    store.history["2026-06-13"] = { score: 40, checked: 2, total: 8, minDayMet: true };
    store.dayChecklists["2026-06-13"] = { breakfast: true, fruit: true };
    localStorage.setItem(`nutrition:daily-score:${CHILD_ID}`, JSON.stringify(store));

    let allowHistorical = false;
    const authFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") {
        const body = JSON.parse(String(init.body)) as { dateKey: string };
        if (body.dateKey === "2026-06-13" && !allowHistorical) {
          return new Response(JSON.stringify({ error: "offline" }), { status: 503 });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true, log: null }), { status: 200 });
    });

    configureNutritionSync(authFetch);
    enqueueNutritionSync(CHILD_ID, "2026-06-13");
    enqueueNutritionSync(CHILD_ID, "2026-06-14");

    const first = await flushNutritionSync(CHILD_ID);
    expect(first).toBe(false);
    expect(localStorage.getItem(`amynest:nutrition-sync-queue:${CHILD_ID}`)).toContain("2026-06-13");

    allowHistorical = true;
    const second = await flushNutritionSync(CHILD_ID);
    expect(second).toBe(true);
    expect(localStorage.getItem(`amynest:nutrition-sync-queue:${CHILD_ID}`)).toBe("[]");
  });
});

describe("nutrition-sync multi-child isolation", () => {
  const CHILD_A = 11;
  const CHILD_B = 22;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T12:00:00"));
  });

  afterEach(() => {
    clearNutritionScoreStorage(CHILD_A);
    clearNutritionScoreStorage(CHILD_B);
    vi.useRealTimers();
  });

  it("keeps separate checklists per child in localStorage", () => {
    persistTodayChecklist(CHILD_A, { breakfast: true, fruit: true });
    persistTodayChecklist(CHILD_B, { protein: true, dairy: true });

    expect(readTodayChecklist(CHILD_A).breakfast).toBe(true);
    expect(readTodayChecklist(CHILD_A).protein).toBeUndefined();
    expect(readTodayChecklist(CHILD_B).protein).toBe(true);
    expect(readTodayChecklist(CHILD_B).breakfast).toBeUndefined();
  });

  it("flush syncs each child queue independently", async () => {
    persistTodayChecklist(CHILD_A, { breakfast: true });
    persistTodayChecklist(CHILD_B, { protein: true });

    const puts: Array<{ childId: number; dateKey: string }> = [];
    const authFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PUT") {
        const body = JSON.parse(String(init.body)) as { childId: number; dateKey: string };
        puts.push(body);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true, log: null }), { status: 200 });
    });

    configureNutritionSync(authFetch);
    enqueueNutritionSync(CHILD_A);
    enqueueNutritionSync(CHILD_B);
    await flushNutritionSync(CHILD_A);
    await flushNutritionSync(CHILD_B);

    expect(puts.some((p) => p.childId === CHILD_A && p.dateKey === "2026-06-14")).toBe(true);
    expect(puts.some((p) => p.childId === CHILD_B && p.dateKey === "2026-06-14")).toBe(true);
  });
});
