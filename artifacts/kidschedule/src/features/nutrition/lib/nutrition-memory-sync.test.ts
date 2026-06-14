import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearMealMemoryStorage,
  configureMealMemorySync,
  flushMealMemorySync,
  persistMealOutcome,
  recordLocalMealOutcome,
} from "@/features/nutrition/lib/nutrition-memory-sync";

const CHILD_ID = 55;

describe("meal memory sync reliability (P1-5)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T12:00:00"));
  });

  afterEach(() => {
    clearMealMemoryStorage(CHILD_ID);
    vi.useRealTimers();
  });

  it("queues outcome when POST fails", async () => {
    const authFetch = vi.fn(async () => new Response(JSON.stringify({ error: "fail" }), { status: 500 }));

    await persistMealOutcome(
      CHILD_ID,
      { dateKey: "2026-06-14", mealSlot: "dinner", mealName: "Dal", outcome: "loved" },
      authFetch,
    );

    expect(localStorage.getItem(`amynest:nutrition-memory-queue:${CHILD_ID}`)).toContain("Dal");
  });

  it("retries queued outcomes when flush succeeds", async () => {
    recordLocalMealOutcome(CHILD_ID, {
      dateKey: "2026-06-14",
      mealSlot: "dinner",
      mealName: "Khichdi",
      outcome: "some",
    });
    localStorage.setItem(
      `amynest:nutrition-memory-queue:${CHILD_ID}`,
      JSON.stringify([
        {
          dateKey: "2026-06-14",
          mealSlot: "dinner",
          mealName: "Khichdi",
          outcome: "some",
          enqueuedAt: Date.now(),
        },
      ]),
    );

    let postCalls = 0;
    const authFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/meal-outcome") && init?.method === "POST") {
        postCalls++;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.includes("/meal-memory") && init?.method === "PUT") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    configureMealMemorySync(authFetch);
    const ok = await flushMealMemorySync(CHILD_ID, authFetch);
    expect(ok).toBe(true);
    expect(postCalls).toBeGreaterThanOrEqual(1);
    expect(localStorage.getItem(`amynest:nutrition-memory-queue:${CHILD_ID}`)).toBeNull();
  });

  it("recovers offline → online via flush", async () => {
    const authFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/meal-outcome") && init?.method === "POST") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (init?.method === "PUT") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    configureMealMemorySync(authFetch);
    await persistMealOutcome(
      CHILD_ID,
      { dateKey: "2026-06-14", mealSlot: "lunch", mealName: "Roti", outcome: "loved" },
      null,
    );

    const ok = await flushMealMemorySync(CHILD_ID, authFetch);
    expect(ok).toBe(true);
    expect(authFetch).toHaveBeenCalled();
  });
});
