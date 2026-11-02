// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushAnalytics, trackFeatureUsage, trackPageView } from "@/lib/analytics";
import { getAnalyticsService, resetAnalyticsServiceForTests } from "./analytics-service";
import { scrubAnalyticsProps } from "./privacy";

vi.mock("@/lib/api", () => ({
  getApiUrl: (path: string) => path,
}));

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  resetAnalyticsServiceForTests();
});

describe("product spine client", () => {
  it("records a page view and a page exit with active duration", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    trackPageView("/dashboard", { screen: "/dashboard", page_name: "/dashboard", path: "/dashboard" });
    getAnalyticsService().trackPageExit("/dashboard", {
      path: "/dashboard",
      screen: "/dashboard",
      page_name: "/dashboard",
      active_duration_ms: 1500,
    });
    await flushAnalytics(fetchMock);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string) as {
      events: Array<{ name: string; eventId?: string; props: Record<string, unknown> }>;
    };
    const names = body.events.map((event) => event.name);
    expect(names).toContain("page_view");
    expect(names).toContain("page_exit");
    const exit = body.events.find((event) => event.name === "page_exit");
    expect(exit?.props.time_on_screen_ms).toBe(1500);
    expect(body.events.every((event) => typeof event.eventId === "string")).toBe(true);
  });

  it("does not emit a second page view for the same path inside the dedupe window", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    trackPageView("/nutrition", { screen: "/nutrition", path: "/nutrition" });
    trackPageView("/nutrition", { screen: "/nutrition", path: "/nutrition" });
    await flushAnalytics(fetchMock);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string) as {
      events: Array<{ name: string }>;
    };
    expect(body.events.filter((event) => event.name === "page_view")).toHaveLength(1);
  });

  it("tracks feature start and completion without storing a prompt", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    trackFeatureUsage("speech_coach", "started");
    trackFeatureUsage("speech_coach", "completed");
    await flushAnalytics(fetchMock);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string) as {
      events: Array<{ name: string; props: Record<string, unknown> }>;
    };
    const names = body.events.map((event) => event.name);
    expect(names).toContain("feature_started");
    expect(names).toContain("feature_completed");
    expect(names).toContain("first_feature_used");
    expect(JSON.stringify(body)).not.toMatch(/prompt|password/);
  });

  it("keeps events queued until the server acknowledges them", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("offline");
    });
    trackPageView("/games", { screen: "/games", path: "/games" });
    await flushAnalytics(fetchMock);
    expect(getAnalyticsService().pendingCount()).toBeGreaterThan(0);
  });

  it("drops only acknowledged event ids and retries the rest", async () => {
    const service = getAnalyticsService();
    service.trackEvent("app_open", {});
    service.trackEvent("session_start", {});
    const pendingBefore = service.pendingCount();
    expect(pendingBefore).toBe(2);
    const queued = JSON.parse(localStorage.getItem("amynest_analytics_persistent_queue") ?? "[]") as Array<{
      eventId: string;
      name: string;
    }>;
    const keep = queued[0]?.eventId;
    const drop = queued[1]?.eventId;
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ acceptedEventIds: [drop], duplicateEventIds: [], droppedEventIds: [] }), {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
    );
    await flushAnalytics(fetchMock);
    const left = JSON.parse(localStorage.getItem("amynest_analytics_persistent_queue") ?? "[]") as Array<{
      eventId: string;
    }>;
    expect(left.map((event) => event.eventId)).toEqual([keep]);
  });

  it("scrubs sensitive analytics properties", () => {
    const clean = scrubAnalyticsProps({
      screen: "/assistant",
      prompt: "what did my child eat",
      password: "nope",
      message: "hello",
      child_name: "Ava",
    });
    expect(clean.screen).toBe("/assistant");
    expect(clean.prompt).toBeUndefined();
    expect(clean.password).toBeUndefined();
    expect(clean.message).toBeUndefined();
    expect(clean.child_name).toBeUndefined();
  });
});
