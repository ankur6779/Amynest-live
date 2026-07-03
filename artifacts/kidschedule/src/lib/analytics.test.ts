// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { track, flushAnalytics, trackAppOpen } from "./analytics";
import { getAnalyticsService, resetAnalyticsServiceForTests } from "./analytics/analytics-service";

vi.mock("@/lib/api", () => ({
  getApiUrl: (p: string) => p,
}));

type Body = { events: Array<{ name: string; props: Record<string, unknown> }>; platform?: string };

function makeFetch() {
  return vi.fn(async () => new Response(null, { status: 202 }));
}

beforeEach(() => {
  sessionStorage.clear();
  resetAnalyticsServiceForTests();
});

describe("analytics client", () => {
  it("flushes queued events to the ingest endpoint with a typed batch", async () => {
    const fetchMock = makeFetch();
    track("routine_viewed", { routineId: 5, dateMode: "today" });
    await flushAnalytics(fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/analytics/events");
    const body = JSON.parse(init.body as string) as Body;
    expect(body.events).toHaveLength(1);
    expect(body.events[0].name).toBe("routine_viewed");
    expect(body.events[0].props).toMatchObject({ routineId: 5, dateMode: "today" });
    expect(typeof body.platform).toBe("string");
  });

  it("is a no-op when there is nothing queued", async () => {
    const fetchMock = makeFetch();
    await flushAnalytics(fetchMock);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("attaches a stable sessionId to events", async () => {
    const fetchMock = makeFetch();
    track("app_open", {});
    track("session_start", {});
    await flushAnalytics(fetchMock);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string) as {
      events: Array<{ sessionId: string }>;
    };
    expect(body.events[0].sessionId).toBeTruthy();
    expect(body.events[0].sessionId).toBe(body.events[1].sessionId);
  });

  it("emits app_open + session_start only once per session", async () => {
    const fetchMock = makeFetch();
    trackAppOpen();
    trackAppOpen();
    await flushAnalytics(fetchMock);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string) as Body;
    const names = body.events.map((e) => e.name);
    expect(names.filter((n) => n === "app_open")).toHaveLength(1);
    expect(names.filter((n) => n === "session_start")).toHaveLength(1);
  });

  it("swallows network errors during flush but retains queue", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });
    track("app_open", {});
    await expect(flushAnalytics(fetchMock)).resolves.toBeUndefined();
    expect(getAnalyticsService().pendingCount()).toBeGreaterThan(0);
  });
});
