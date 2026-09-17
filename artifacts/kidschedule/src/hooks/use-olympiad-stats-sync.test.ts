import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import {
  freshOlympiadStats,
  type ChildOlympiadStats,
} from "@/lib/olympiad-local-stats";
import {
  isVirginOlympiadStats,
  useOlympiadStatsAutoSync,
} from "@/hooks/use-olympiad-stats-sync";

const authFetch = vi.fn();

vi.mock("@/hooks/use-auth-fetch", () => ({
  useAuthFetch: () => authFetch,
}));

function richServerStats(overrides: Partial<ChildOlympiadStats> = {}): ChildOlympiadStats {
  return {
    ...freshOlympiadStats(),
    totalPoints: 420,
    streak: 9,
    clientUpdatedAt: "2026-09-10T12:00:00.000Z",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Mirrors OlympiadZone remount-on-child: fresh local stats per childId. */
function useAutoSyncHarness(childId: number) {
  const [seenId, setSeenId] = useState(childId);
  const [stats, setStats] = useState<ChildOlympiadStats>(() => freshOlympiadStats());
  if (seenId !== childId) {
    setSeenId(childId);
    setStats(freshOlympiadStats());
  }
  useOlympiadStatsAutoSync(childId, stats, setStats);
  return stats;
}

describe("isVirginOlympiadStats", () => {
  it("treats fresh stats as virgin", () => {
    expect(isVirginOlympiadStats(freshOlympiadStats())).toBe(true);
  });

  it("treats stamped or scored stats as non-virgin", () => {
    expect(
      isVirginOlympiadStats({
        ...freshOlympiadStats(),
        clientUpdatedAt: "2026-09-10T12:00:00.000Z",
      }),
    ).toBe(false);
    expect(
      isVirginOlympiadStats({
        ...freshOlympiadStats(),
        totalPoints: 10,
      }),
    ).toBe(false);
  });
});

describe("useOlympiadStatsAutoSync hydrate-before-push", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    authFetch.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not push empty local stats before hydrate finishes", async () => {
    let resolveHydrate!: (v: Response) => void;
    const hydratePromise = new Promise<Response>((resolve) => {
      resolveHydrate = resolve;
    });

    authFetch.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(jsonResponse({ ok: true, merged: true }));
      }
      return hydratePromise;
    });

    renderHook(() => useAutoSyncHarness(7));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(authFetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);

    await act(async () => {
      resolveHydrate(
        jsonResponse({
          ok: true,
          stats: richServerStats(),
          clientUpdatedAt: "2026-09-10T12:00:00.000Z",
        }),
      );
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    await waitFor(() => {
      const postsAfter = authFetch.mock.calls.filter(([, init]) => init?.method === "POST");
      expect(postsAfter.length).toBeGreaterThanOrEqual(1);
      const body = JSON.parse(String(postsAfter[0]![1]!.body));
      expect(body.stats.totalPoints).toBe(420);
      expect(body.stats.streak).toBe(9);
    });
  });

  it("re-hydrates on childId change and does not push virgin empty for the new child", async () => {
    const posts: Array<{ childId: number; totalPoints: number }> = [];

    authFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        posts.push({ childId: body.childId, totalPoints: Number(body.stats.totalPoints) });
        return Promise.resolve(jsonResponse({ ok: true, merged: true }));
      }
      const childId = Number(new URL(url, "http://local").searchParams.get("childId"));
      if (childId === 1) {
        return Promise.resolve(
          jsonResponse({
            ok: true,
            stats: richServerStats({ totalPoints: 100 }),
            clientUpdatedAt: "2026-09-10T12:00:00.000Z",
          }),
        );
      }
      return Promise.resolve(
        jsonResponse({
          ok: true,
          stats: richServerStats({ totalPoints: 999, streak: 3 }),
          clientUpdatedAt: "2026-09-11T12:00:00.000Z",
        }),
      );
    });

    const { rerender } = renderHook(({ childId }) => useAutoSyncHarness(childId), {
      initialProps: { childId: 1 },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    posts.length = 0;
    rerender({ childId: 2 });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(posts).toHaveLength(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    await waitFor(() => {
      expect(posts.some((p) => p.childId === 2 && p.totalPoints === 0)).toBe(false);
      expect(posts.some((p) => p.childId === 2 && p.totalPoints === 999)).toBe(true);
    });
  });
});
