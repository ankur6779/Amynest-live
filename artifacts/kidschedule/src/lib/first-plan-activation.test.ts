import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./conversion-funnel", () => ({
  trackConversionFunnel: vi.fn(),
}));

vi.mock("./calendar-date", () => ({
  localCalendarDateKey: () => "2026-09-13",
}));

import { trackConversionFunnel } from "./conversion-funnel";
import {
  activateFirstPlan,
  clearFirstPlanCache,
  findTodayRoutine,
  firstPlanResultStorageKey,
  pickExactTodayRoutine,
  readFirstPlanCache,
  writeFirstPlanCache,
} from "./first-plan-activation";

const TODAY = "2026-09-13";
const STALE = "2026-08-09";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const todayItem = { time: "07:00", activity: "Wind-down", duration: 10, category: "rest" };

function todayRoutine(id: number, childId: number) {
  return { id, childId, date: TODAY, items: [todayItem], title: "Today" };
}

describe("pickExactTodayRoutine", () => {
  it("rejects a stale API result for the requested date", () => {
    expect(
      pickExactTodayRoutine(
        [{ id: 70, childId: 1, date: STALE, items: [todayItem] }],
        1,
        TODAY,
      ),
    ).toBeNull();
  });

  it("accepts the exact child and local date", () => {
    expect(pickExactTodayRoutine([todayRoutine(91, 1)], 1, TODAY)).toBe(91);
  });

  it("rejects the right date on the wrong child", () => {
    expect(pickExactTodayRoutine([todayRoutine(92, 2)], 1, TODAY)).toBeNull();
  });
});

describe("first-plan cache identity", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("misses when the stored date is not today", () => {
    sessionStorage.setItem(
      firstPlanResultStorageKey(1, STALE),
      JSON.stringify({ routineId: 70, childId: 1, date: STALE }),
    );
    expect(readFirstPlanCache(1, TODAY)).toBeNull();
  });

  it("does not let child A's today cache satisfy child B", () => {
    writeFirstPlanCache({ routineId: 91, childId: 1, date: TODAY });
    expect(readFirstPlanCache(1, TODAY)?.routineId).toBe(91);
    expect(readFirstPlanCache(2, TODAY)).toBeNull();
  });

  it("ignores a legacy unscoped poison cache", () => {
    sessionStorage.setItem(
      "amynest_first_plan_result_v1",
      JSON.stringify({ routineId: 70, childId: 1, date: TODAY }),
    );
    expect(readFirstPlanCache(1, TODAY)).toBeNull();
  });
});

describe("findTodayRoutine", () => {
  it("does not accept an old routine returned for today's query", async () => {
    const authFetch = vi.fn(async () =>
      jsonResponse([{ id: 70, childId: 1, date: STALE, items: [todayItem] }]),
    );
    await expect(findTodayRoutine(authFetch, 1, TODAY)).resolves.toBeNull();
  });
});

describe("activateFirstPlan", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.mocked(trackConversionFunnel).mockClear();
  });

  it("reuses today's existing routine instead of generating twice", async () => {
    const authFetch = vi.fn(async (url: string) => {
      const path = String(url);
      if (path.startsWith("/api/routines?") || path === "/api/routines") {
        return jsonResponse([todayRoutine(42, 7)]);
      }
      if (path === "/api/routines/42") return jsonResponse(todayRoutine(42, 7));
      throw new Error(`unexpected ${path}`);
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
    if (second.status === "ready") expect(second.routineId).toBe(42);
    expect(authFetch.mock.calls.some((c) => String(c[0]).includes("generate"))).toBe(false);
    expect(vi.mocked(trackConversionFunnel).mock.calls.map((c) => c[0])).toEqual([
      "first_plan_generated",
      "first_plan_generated",
    ]);
  });

  it("does not block a second child while another plan is in flight", async () => {
    let releaseChild7: (() => void) | undefined;
    const hang = new Promise<void>((resolve) => {
      releaseChild7 = resolve;
    });
    const authFetch = vi.fn(async (url: string, init?: RequestInit) => {
      const path = String(url);
      if (path.startsWith("/api/routines?") && path.includes("childId=7")) {
        await hang;
        return jsonResponse([todayRoutine(42, 7)]);
      }
      if (path === "/api/routines/42") return jsonResponse(todayRoutine(42, 7));
      if (path.startsWith("/api/routines?") && path.includes("childId=8")) {
        return jsonResponse([todayRoutine(88, 8)]);
      }
      if (path === "/api/routines/88") return jsonResponse(todayRoutine(88, 8));
      throw new Error(`unexpected ${path} ${init?.method ?? ""}`);
    });
    const first = activateFirstPlan({ authFetch, childId: 7, source: "test" });
    const second = await activateFirstPlan({ authFetch, childId: 8, source: "test" });
    expect(second.status).toBe("ready");
    if (second.status === "ready") expect(second.routineId).toBe(88);
    releaseChild7?.();
    await first;
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

  it("generates when the date-filtered list only contains a stale routine", async () => {
    const authFetch = vi.fn(async (url: string, init?: RequestInit) => {
      const path = String(url);
      const method = init?.method ?? "GET";
      if (method === "GET" && (path.startsWith("/api/routines?") || path === "/api/routines")) {
        return jsonResponse([{ id: 70, childId: 1, date: STALE, items: [todayItem] }]);
      }
      if (method === "POST" && path.includes("/routines/generate")) {
        return jsonResponse({ title: "Today", items: [todayItem] });
      }
      if (method === "POST" && path === "/api/routines") {
        return jsonResponse(todayRoutine(91, 1), 201);
      }
      if (method === "GET" && path === "/api/routines/91") {
        return jsonResponse(todayRoutine(91, 1));
      }
      throw new Error(`unexpected ${method} ${path}`);
    });
    const result = await activateFirstPlan({ authFetch, childId: 1, source: "dashboard_safety_net" });
    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.routineId).toBe(91);
    expect(result.reused).toBe(false);
    expect(readFirstPlanCache(1, TODAY)?.routineId).toBe(91);
  });

  it("fails when generation 200 persists a stale routine", async () => {
    const authFetch = vi.fn(async (url: string, init?: RequestInit) => {
      const path = String(url);
      const method = init?.method ?? "GET";
      if (method === "GET" && (path.startsWith("/api/routines?") || path === "/api/routines")) {
        return jsonResponse([]);
      }
      if (method === "POST" && path.includes("/routines/generate")) {
        return jsonResponse({ title: "Stale", items: [todayItem] });
      }
      if (method === "POST" && path === "/api/routines") {
        return jsonResponse({ id: 70, childId: 1, date: STALE, items: [todayItem] }, 201);
      }
      if (method === "GET" && path === "/api/routines/70") {
        return jsonResponse({ id: 70, childId: 1, date: STALE, items: [todayItem] });
      }
      throw new Error(`unexpected ${method} ${path}`);
    });
    const result = await activateFirstPlan({ authFetch, childId: 1, source: "test" });
    expect(result.status).toBe("failed");
    if (result.status !== "failed") return;
    expect(result.retryable).toBe(true);
    expect(readFirstPlanCache(1, TODAY)).toBeNull();
  });

  it("does not treat a stale cached id as today's plan", async () => {
    writeFirstPlanCache({ routineId: 70, childId: 1, date: TODAY });
    const authFetch = vi.fn(async (url: string, init?: RequestInit) => {
      const path = String(url);
      const method = init?.method ?? "GET";
      if (method === "GET" && path === "/api/routines/70") {
        return jsonResponse({ id: 70, childId: 1, date: STALE, items: [todayItem] });
      }
      if (method === "GET" && (path.startsWith("/api/routines?") || path === "/api/routines")) {
        return jsonResponse([]);
      }
      if (method === "POST" && path.includes("/routines/generate")) {
        return jsonResponse({ title: "Today", items: [todayItem] });
      }
      if (method === "POST" && path === "/api/routines") {
        return jsonResponse(todayRoutine(91, 1), 201);
      }
      if (method === "GET" && path === "/api/routines/91") {
        return jsonResponse(todayRoutine(91, 1));
      }
      throw new Error(`unexpected ${method} ${path}`);
    });
    const result = await activateFirstPlan({ authFetch, childId: 1, source: "test" });
    expect(result.status).toBe("ready");
    if (result.status === "ready") expect(result.routineId).toBe(91);
    expect(readFirstPlanCache(1, TODAY)?.routineId).toBe(91);
    clearFirstPlanCache(1, TODAY);
  });

  it("keeps child A and child B caches isolated after refresh", async () => {
    const authFetch = vi.fn(async (url: string) => {
      const path = String(url);
      if (path.includes("childId=1")) return jsonResponse([todayRoutine(91, 1)]);
      if (path.includes("childId=2")) return jsonResponse([todayRoutine(92, 2)]);
      if (path === "/api/routines/91") return jsonResponse(todayRoutine(91, 1));
      if (path === "/api/routines/92") return jsonResponse(todayRoutine(92, 2));
      throw new Error(`unexpected ${path}`);
    });
    const a = await activateFirstPlan({ authFetch, childId: 1, source: "test" });
    const b = await activateFirstPlan({ authFetch, childId: 2, source: "test" });
    expect(a.status === "ready" && a.routineId === 91).toBe(true);
    expect(b.status === "ready" && b.routineId === 92).toBe(true);
    const aAgain = await activateFirstPlan({ authFetch, childId: 1, source: "refresh" });
    expect(aAgain.status === "ready" && aAgain.routineId === 91).toBe(true);
    expect(readFirstPlanCache(1, TODAY)?.routineId).toBe(91);
    expect(readFirstPlanCache(2, TODAY)?.routineId).toBe(92);
  });
});
