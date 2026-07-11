import { describe, it, beforeEach, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import {
  initStartupFunnelTelemetry,
  trackStartupFunnel,
  resetStartupFunnelTelemetryForTests,
  clearStartupFunnelQueueForTests,
  getStartupFunnelQueueSize,
} from "@/lib/startup-funnel";

describe("startup-funnel tracker", () => {
  beforeEach(() => {
    resetStartupFunnelTelemetryForTests();
    clearStartupFunnelQueueForTests();
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal("performance", { timeOrigin: Date.now() - 5000, now: () => Date.now() });
    (window as Window & { __AMYNEST_LAUNCH_TS?: number }).__AMYNEST_LAUNCH_TS = Date.now() - 5000;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dedupes milestone events per session", () => {
    initStartupFunnelTelemetry();
    trackStartupFunnel("react_first_render");
    trackStartupFunnel("react_first_render");
    assert.equal(getStartupFunnelQueueSize(), 3);
  });

  it("drains early queue from index.html stub", () => {
    (window as Window & { __amynestFunnelQueueEarly?: Array<{ name: string }> })
      .__amynestFunnelQueueEarly = [{ name: "native_splash_started", ts: Date.now() }];
    initStartupFunnelTelemetry();
    const names = JSON.parse(localStorage.getItem("amynest:startup-funnel:queue:v1") ?? "[]").map(
      (e: { event_name: string }) => e.event_name,
    );
    assert.ok(names.includes("native_splash_started"));
  });
});
