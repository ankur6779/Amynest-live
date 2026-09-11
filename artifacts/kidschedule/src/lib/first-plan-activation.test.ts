import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./conversion-funnel", () => ({
  trackConversionFunnel: vi.fn(),
}));

vi.mock("./routine-generation-client", () => ({
  enrichRoutinePayload: (p: unknown) => p,
  fetchRoutineWithResilience: vi.fn(async () => ({
    title: "Generated",
    items: [{ time: "08:00", activity: "Breakfast", duration: 30, category: "meal" }],
    adaptations: [],
    fallback: false,
  })),
  RoutineGenerationPaywallError: class extends Error {},
}));

import { activateFirstPlan } from "./first-plan-activation";

function localToday(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("activateFirstPlan", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("reuses today's existing routine instead of generating twice", async () => {
    const today = localToday();
    const authFetch = vi.fn(async (url: string) => {
      if (String(url).startsWith("/api/routines?")) {
        return jsonResponse([{ id: 42, childId: 7, date: today }]);
      }
      throw new Error(`unexpected ${url}`);
    });
    const first = await activateFirstPlan({
      authFetch,
      childId: 7,
      childName: "Noah",
      source: "test",
    });
    expect(first.status).toBe("ready");
    if (first.status !== "ready") return;
    expect(first.routineId).toBe(42);
    expect(first.reused).toBe(true);
    const second = await activateFirstPlan({ authFetch, childId: 7 });
    expect(second.status).toBe("ready");
    expect(authFetch).toHaveBeenCalledTimes(1);
  });

  it("ignores yesterday's routine when looking for today", async () => {
    const today = localToday();
    const authFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).startsWith("/api/routines?") && (!init || !init.method || init.method === "GET")) {
        return jsonResponse([{ id: 41, childId: 7, date: "2000-01-01" }]);
      }
      if (url === "/api/routines" && init?.method === "POST") {
        return jsonResponse({ id: 99 });
      }
      throw new Error(`unexpected ${String(url)} ${init?.method ?? "GET"}`);
    });
    const result = await activateFirstPlan({ authFetch, childId: 7, childName: "Noah" });
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.routineId).toBe(99);
    expect(result.reused).toBe(false);
    const post = authFetch.mock.calls.find(
      (c) => c[0] === "/api/routines" && (c[1] as RequestInit | undefined)?.method === "POST",
    );
    expect(post).toBeTruthy();
    const body = JSON.parse(String((post![1] as RequestInit).body));
    expect(body.date).toBe(today);
    expect(body.override).toBe(false);
  });

  it("reuses conflictId on 409 without override wipe", async () => {
    const authFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).startsWith("/api/routines?") && (!init || !init.method || init.method === "GET")) {
        return jsonResponse([]);
      }
      if (url === "/api/routines" && init?.method === "POST") {
        return jsonResponse({ error: "routine_exists", routineId: 77 }, 409);
      }
      throw new Error(`unexpected ${String(url)}`);
    });
    const result = await activateFirstPlan({ authFetch, childId: 7, childName: "Noah" });
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.routineId).toBe(77);
    expect(result.reused).toBe(true);
    const posts = authFetch.mock.calls.filter(
      (c) => c[0] === "/api/routines" && (c[1] as RequestInit | undefined)?.method === "POST",
    );
    expect(posts).toHaveLength(1);
    const body = JSON.parse(String((posts[0]![1] as RequestInit).body));
    expect(body.override).toBe(false);
  });

  it("returns retryable failure when no child exists", async () => {
    const authFetch = vi.fn(async (url: string) => {
      if (url === "/api/children") return jsonResponse([]);
      throw new Error(`unexpected ${url}`);
    });
    const result = await activateFirstPlan({ authFetch });
    expect(result.status).toBe("failed");
    if (result.status !== "failed") return;
    expect(result.reason).toBe("no_child");
    expect(result.retryable).toBe(false);
  });
});
