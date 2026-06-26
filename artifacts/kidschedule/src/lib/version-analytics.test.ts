import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  flushVersionAnalyticsQueue,
  trackVersionAnalytics,
} from "./version-analytics";

function setOnline(value: boolean): void {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  });
}

describe("version analytics", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    setOnline(true);
    vi.restoreAllMocks();
  });

  it("deduplicates by event ID before delivery", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    trackVersionAnalytics(
      "force_update_displayed",
      {
        platform: "android",
        installedVersion: "1.0.0",
        minimumVersion: "1.1.0",
        latestVersion: "1.2.0",
        forceUpdate: true,
      },
      { onceKey: "android:1.0.0:1.1.0:displayed" },
    );
    trackVersionAnalytics(
      "force_update_displayed",
      {
        platform: "android",
        installedVersion: "1.0.0",
        minimumVersion: "1.1.0",
        latestVersion: "1.2.0",
        forceUpdate: true,
      },
      { onceKey: "android:1.0.0:1.1.0:displayed" },
    );

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.events).toHaveLength(1);
  });

  it("queues while offline and flushes after connectivity returns", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    setOnline(false);

    trackVersionAnalytics(
      "version_policy_fetch_failed",
      {
        platform: "ios",
        installedVersion: "1.0.0",
        reason: "network_offline",
      },
      { onceKey: "ios:1.0.0:offline" },
    );

    expect(fetchMock).not.toHaveBeenCalled();

    setOnline(true);
    await flushVersionAnalyticsQueue();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.events[0].name).toBe("version_policy_fetch_failed");
  });
});
