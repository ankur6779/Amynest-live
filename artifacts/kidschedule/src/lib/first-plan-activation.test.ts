import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./conversion-funnel", () => ({
  trackConversionFunnel: vi.fn(),
}));

import { trackConversionFunnel } from "./conversion-funnel";
import { localCalendarDateKey } from "./calendar-date";
import { activateFirstPlan } from "./first-plan-activation";

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
    const authFetch = vi.fn(async (url: string) => {
      if (String(url).startsWith("/api/routines?")) {
        return jsonResponse([{ id: 42, childId: 7, date: localCalendarDateKey() }]);
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
    expect(vi.mocked(trackConversionFunnel).mock.calls.map((c) => c[0])).toEqual([
      "first_plan_generated",
    ]);
  });

  it("does not block a second child while another plan is in flight", async () => {
    let releaseChild7: (() => void) | undefined;
    const hang = new Promise<void>((resolve) => {
      releaseChild7 = resolve;
    });
    const authFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).startsWith("/api/routines?") && String(url).includes("childId=7")) {
        await hang;
        return jsonResponse([{ id: 42, childId: 7, date: localCalendarDateKey() }]);
      }
      if (String(url).startsWith("/api/routines?") && String(url).includes("childId=8")) {
        return jsonResponse([{ id: 88, childId: 8, date: localCalendarDateKey() }]);
      }
      throw new Error(`unexpected ${url} ${init?.method ?? ""}`);
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
});
