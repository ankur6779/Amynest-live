import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RETENTION_STATUS_CACHE_KEY,
  clearRetentionCache,
  fetchRetentionStatus,
  isValidRetentionStatus,
  readRetentionCache,
  writeRetentionCache,
  type RetentionStatus,
} from "@/lib/retention/retention-api";

export function mockRetentionStatus(overrides?: Partial<RetentionStatus>): RetentionStatus {
  return {
    ok: true,
    state: {
      currentStreak: 3,
      longestStreak: 5,
      totalStars: 10,
      totalCoins: 20,
      parentXp: 45,
      dailyGoals: { routine: false, story: true, activity: false, speech: false },
      achievements: [],
      inactiveDays: 0,
      winbackLevel: 0,
    },
    shieldAvailable: true,
    canUseShield: false,
    parentingScore: 72,
    goalsComplete: 1,
    goalsTotal: 4,
    checkedInToday: true,
    resumeItems: [],
    preferences: {},
    weeklySummary: null,
    trialPremiumFeature: null,
    ...overrides,
  };
}

describe("retention-api validation", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("accepts a complete retention status payload", () => {
    expect(isValidRetentionStatus(mockRetentionStatus())).toBe(true);
  });

  it("rejects missing state", () => {
    expect(isValidRetentionStatus({ ok: true })).toBe(false);
  });

  it("rejects null state", () => {
    expect(isValidRetentionStatus({ ok: true, state: null })).toBe(false);
  });

  it("rejects partial state", () => {
    expect(
      isValidRetentionStatus({
        ok: true,
        state: { currentStreak: 1 },
      }),
    ).toBe(false);
  });

  it("rejects empty object", () => {
    expect(isValidRetentionStatus({})).toBe(false);
  });

  it("discards malformed cache and clears sessionStorage", () => {
    sessionStorage.setItem(RETENTION_STATUS_CACHE_KEY, JSON.stringify({ ok: true }));
    expect(readRetentionCache()).toBeUndefined();
    expect(sessionStorage.getItem(RETENTION_STATUS_CACHE_KEY)).toBeNull();
  });

  it("reads valid cache", () => {
    const status = mockRetentionStatus();
    sessionStorage.setItem(RETENTION_STATUS_CACHE_KEY, JSON.stringify(status));
    expect(readRetentionCache()).toEqual(status);
  });

  it("does not write invalid payloads to cache", () => {
    writeRetentionCache({ ok: true } as RetentionStatus);
    expect(sessionStorage.getItem(RETENTION_STATUS_CACHE_KEY)).toBeNull();
  });

  it("writes valid payloads to cache", () => {
    const status = mockRetentionStatus();
    writeRetentionCache(status);
    expect(JSON.parse(sessionStorage.getItem(RETENTION_STATUS_CACHE_KEY)!)).toEqual(status);
  });

  it("clearRetentionCache removes the key", () => {
    writeRetentionCache(mockRetentionStatus());
    clearRetentionCache();
    expect(sessionStorage.getItem(RETENTION_STATUS_CACHE_KEY)).toBeNull();
  });

  it("fetchRetentionStatus throws on HTTP 500 and does not cache", async () => {
    const authFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "server_error" }), { status: 500 }),
    );
    await expect(fetchRetentionStatus(authFetch)).rejects.toThrow(/retention status 500/);
    expect(sessionStorage.getItem(RETENTION_STATUS_CACHE_KEY)).toBeNull();
  });

  it("fetchRetentionStatus throws on partial 200 payload and does not cache", async () => {
    const authFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(fetchRetentionStatus(authFetch)).rejects.toThrow(/retention status invalid/);
    expect(sessionStorage.getItem(RETENTION_STATUS_CACHE_KEY)).toBeNull();
  });

  it("fetchRetentionStatus caches valid 200 payload", async () => {
    const status = mockRetentionStatus({ checkedInToday: false });
    const authFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(status), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const result = await fetchRetentionStatus(authFetch);
    expect(result.state.currentStreak).toBe(3);
    expect(readRetentionCache()?.state.currentStreak).toBe(3);
  });
});

describe("safe optional chaining for retention state", () => {
  function readStreak(data: { state?: { currentStreak?: number } | null } | undefined) {
    return data?.state?.currentStreak ?? 0;
  }

  function readParentXp(data: { state?: { parentXp?: number } | null } | undefined) {
    return (data?.state?.parentXp ?? 0) % 100;
  }

  it("does not throw when state is missing", () => {
    expect(readStreak({ ok: true } as { state?: { currentStreak?: number } })).toBe(0);
    expect(readParentXp({ ok: true } as { state?: { parentXp?: number } })).toBe(0);
  });

  it("does not throw when state is null", () => {
    expect(readStreak({ ok: true, state: null })).toBe(0);
    expect(readParentXp({ ok: true, state: null })).toBe(0);
  });

  it("is safe when data is undefined", () => {
    expect(readStreak(undefined)).toBe(0);
    expect(readParentXp(undefined)).toBe(0);
  });
});
