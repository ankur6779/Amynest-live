// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getAnalyticsService,
  resetAnalyticsServiceForTests,
} from "./analytics/analytics-service";
import { scrubAnalyticsProps } from "./analytics/privacy";
import { PERSISTENT_QUEUE_KEY } from "./analytics/constants";

vi.mock("@/lib/api", () => ({
  getApiUrl: (p: string) => p,
}));

vi.mock("@/lib/device-id", () => ({
  applyDeviceHeaders: (h: Headers) => h,
  getOrCreateDeviceId: () => "test-device-id-12345678",
}));

type Body = {
  events: Array<{
    name: string;
    props: Record<string, unknown>;
    sessionId: string;
  }>;
  platform?: string;
  appVersion?: string;
  buildNumber?: string;
  environment?: string;
};

function makeFetch(ok = true) {
  return vi.fn(async () => new Response(null, { status: ok ? 202 : 500 }));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetAnalyticsServiceForTests();
});

afterEach(() => {
  resetAnalyticsServiceForTests();
});

describe("AnalyticsService", () => {
  it("includes envelope fields on every event", async () => {
    const fetchMock = makeFetch();
    const service = getAnalyticsService();
    service.track("routine_viewed", { routineId: 1 });
    await service.flush(fetchMock);

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string) as Body;
    const props = body.events[0].props;
    expect(props.event_version).toBe(1);
    expect(props.schema_version).toBe("1.0.0");
    expect(typeof props.app_version).toBe("string");
    expect(typeof props.build_number).toBe("string");
    expect(typeof props.environment).toBe("string");
  });

  it("requeues events on network failure (offline support)", async () => {
    const failingFetch = vi.fn(async () => {
      throw new Error("offline");
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const service = getAnalyticsService();
    service.track("app_open", {});
    await service.flush(failingFetch);

    expect(failingFetch).toHaveBeenCalled();
    const stored = localStorage.getItem(PERSISTENT_QUEUE_KEY);
    expect(stored).toBeTruthy();
    expect(service.pendingCount()).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });

  it("flushes via preauth endpoint when auth fetch is unavailable", async () => {
    const preauthFetch = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", preauthFetch);
    const service = getAnalyticsService();
    service.track("first_open", { cold: true });
    await service.flush();
    expect(preauthFetch).toHaveBeenCalled();
    const url = String(preauthFetch.mock.calls[0][0]);
    expect(url).toContain("/api/analytics/preauth-events");
    vi.unstubAllGlobals();
  });

  it("dedupes identical events within 300ms", async () => {
    const fetchMock = makeFetch();
    const service = getAnalyticsService();
    service.track("app_open", {});
    service.track("app_open", {});
    await service.flush(fetchMock);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string) as Body;
    expect(body.events.filter((e) => e.name === "app_open")).toHaveLength(1);
  });

  it("scrubs PII keys from props", () => {
    const out = scrubAnalyticsProps({ email: "a@b.com", step: "ok" });
    expect(out.email).toBeUndefined();
    expect(out.step).toBe("ok");
  });

  it("trackAppOpen emits first_open once", async () => {
    const fetchMock = makeFetch();
    const service = getAnalyticsService();
    service.trackAppOpen();
    service.trackAppOpen();
    await service.flush(fetchMock);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string) as Body;
    const names = body.events.map((e) => e.name);
    expect(names).toContain("first_open");
    expect(names.filter((n) => n === "app_open")).toHaveLength(1);
  });
});
