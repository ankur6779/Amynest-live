import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./conversion-funnel", () => ({
  trackConversionFunnel: vi.fn(),
}));

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
        return jsonResponse([{ id: 42, childId: 7, date: new Date().toISOString().slice(0, 10) }]);
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
