import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getStartupTelemetryStats,
  ingestStartupEvent,
  resetStartupTelemetryForTests,
} from "../startup-telemetry-store.js";

test("startup-telemetry-store computes percentile stats from phase events", () => {
  resetStartupTelemetryForTests();
  const t0 = 1_000;
  ingestStartupEvent({
    ts: t0,
    event: "startup_phase_entered",
    phase: "react_render",
    app_version: "v1",
    platform: "web",
    browser: "chrome",
    route: "/pricing",
  });
  ingestStartupEvent({
    ts: t0 + 120,
    event: "startup_phase_completed",
    phase: "react_render",
    app_version: "v1",
    platform: "web",
    browser: "chrome",
    route: "/pricing",
  });
  ingestStartupEvent({
    ts: t0 + 800,
    event: "startup_phase_completed",
    phase: "app_core_ready",
    app_version: "v1",
    platform: "web",
    browser: "chrome",
    route: "/pricing",
  });

  const stats = getStartupTelemetryStats();
  assert.equal(stats.sampleCount, 3);
  assert.ok(stats.reactRenderMs.p50 > 0);
  assert.ok(stats.appCoreReadyMs.p50 > 0);
});
