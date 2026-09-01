import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLearningSyncForTests,
  configureLearningSync,
  enqueueLearningActivity,
  getLearningSyncStorageKeyForTests,
  getSyncDiagnostics,
  setLearningSyncUser,
} from "@/lib/learning-sync-engine";

describe("learning-sync user scoping", () => {
  beforeEach(() => {
    localStorage.clear();
    clearLearningSyncForTests();
    vi.useRealTimers();
  });

  it("does not enqueue when no signed-in user is bound", () => {
    setLearningSyncUser(null);
    expect(
      enqueueLearningActivity({
        childId: 1,
        activityId: "act-1",
        section: "phonics",
      }),
    ).toBe(false);
    expect(getSyncDiagnostics().queueDepth).toBe(0);
  });

  it("keeps user A queue when switching to user B", async () => {
    const posts: Array<{ childId: number; auth: string }> = [];
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { childId: number };
      const auth = String((init?.headers as Record<string, string>)?.Authorization ?? "");
      posts.push({ childId: body.childId, auth });
      if (auth.includes("user-b")) {
        return new Response(JSON.stringify({ error: "child_not_found" }), { status: 404 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });

    configureLearningSync({
      fetcher,
      userId: "user-a",
      getApiUrl: (p) => p,
    });
    expect(
      enqueueLearningActivity({
        childId: 42,
        activityId: "phonics-cat",
        section: "phonics",
        at: "2026-09-01T10:00:00.000Z",
      }),
    ).toBe(true);

    const keyA = getLearningSyncStorageKeyForTests("user-a");
    expect(localStorage.getItem(keyA)).toContain("phonics-cat");

    // Switch accounts — A's pending completions must stay under A's key.
    setLearningSyncUser("user-b");
    expect(getSyncDiagnostics().queueDepth).toBe(0);
    expect(localStorage.getItem(keyA)).toContain("phonics-cat");
    expect(localStorage.getItem(getLearningSyncStorageKeyForTests("user-b"))).toBeNull();

    // Rebind A — queue restored, not burned by B's 404s.
    setLearningSyncUser("user-a");
    expect(getSyncDiagnostics().queueDepth).toBe(1);
    expect(getSyncDiagnostics().pendingClientIds[0]).toContain("phonics-cat");
  });

  it("does not permanently drop queue items on 401/404 while signed in as owner", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fetcher = vi.fn(async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
    });

    configureLearningSync({
      fetcher,
      userId: "user-a",
      getApiUrl: (p) => p,
    });
    enqueueLearningActivity({
      childId: 7,
      activityId: "study-1",
      section: "math",
      at: "2026-09-01T11:00:00.000Z",
    });

    await vi.advanceTimersByTimeAsync(200);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(200_000);
    await Promise.resolve();

    expect(calls).toBeGreaterThan(0);
    expect(getSyncDiagnostics().queueDepth).toBe(1);
    expect(localStorage.getItem(getLearningSyncStorageKeyForTests("user-a"))).toContain("study-1");
  });
});
