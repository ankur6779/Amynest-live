import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logClientError } from "@/lib/log-client-error";

vi.mock("@/lib/api", () => ({
  getApiUrl: (path: string) => `https://api.test${path}`,
}));

vi.mock("@/lib/firebase", () => ({
  getFirebaseAuth: () => ({
    currentUser: null,
  }),
}));

describe("log-client-error resilience", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("window", {
      location: { pathname: "/dashboard", href: "https://www.amynest.in/dashboard" },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("never throws when /api/logs returns 500", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("error", { status: 500 }));
    await expect(
      logClientError({ message: "TEST_PRODUCTION_CRASH", label: "audit" }),
    ).resolves.toBeUndefined();
  });

  it("never throws when fetch times out", async () => {
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        }),
    );
    await expect(
      logClientError({ message: "offline crash", stack: "Error: x" }),
    ).resolves.toBeUndefined();
  });

  it("never throws when network is unavailable (DNS failure)", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(
      logClientError({
        message: "TEST_PRODUCTION_CRASH",
        meta: { errorId: "ERR-20260606-ABC123" },
      }),
    ).resolves.toBeUndefined();
  });

  it("prefixes errorId in message for log searchability", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
    await logClientError({
      message: "[ERR-20260606-ABC123] TEST_PRODUCTION_CRASH",
      meta: {
        errorId: "ERR-20260606-ABC123",
        route: "/children/child-1",
        childId: "child-1",
        userId: "user-1",
        browser: "Chrome",
        appVersion: "1.2.3",
        componentStack: "at ChildForm",
        timestamp: "2026-06-06T00:00:00.000Z",
      },
      stack: "Error: TEST_PRODUCTION_CRASH\n  at ChildForm",
    });

    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body.message).toContain("ERR-20260606-ABC123");
    expect(body.meta.errorId).toBe("ERR-20260606-ABC123");
    expect(body.meta.childId).toBe("child-1");
    expect(body.meta.stack).toContain("TEST_PRODUCTION_CRASH");
  });
});
