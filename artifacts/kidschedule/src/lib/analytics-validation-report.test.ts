/**
 * Phase 1 analytics validation — coverage, taxonomy, and duplicate emitter audit.
 * Run: pnpm --filter @workspace/kidschedule exec vitest run src/lib/analytics-validation-report.test.ts
 */
import { describe, it, expect } from "vitest";
import { analyticsEventCategory } from "@workspace/analytics-taxonomy";
import {
  REQUIRED_PHASE1_EVENTS,
  buildAnalyticsValidationReport,
} from "./analytics/validation-report";

describe("Phase 1 analytics validation report", () => {
  const r = buildAnalyticsValidationReport();

  it("registers all required Phase 1 taxonomy events", () => {
    expect(r.phase1Missing).toEqual([]);
    expect(r.phase1Present.length).toBe(REQUIRED_PHASE1_EVENTS.length);
  });

  it("has no growth_analytics duplicate client-log emitter", () => {
    expect(r.duplicateGrowthEmitter).toBe(false);
    expect(r.duplicateEmitterFiles).toEqual([]);
  });

  it("wires all Phase 1 events in client code", () => {
    expect(r.unwiredPhase1Events).toEqual([]);
  });

  it("covers all routes with automatic screen tracking", () => {
    expect(r.routeCount).toBeGreaterThan(50);
    expect(r.screenTrackingCoveragePct).toBe(100);
  });

  it("taxonomy has 80+ events (legacy + phase1)", () => {
    expect(r.taxonomyEventCount).toBeGreaterThanOrEqual(80);
  });

  it("assigns categories to all phase1 events", () => {
    for (const e of REQUIRED_PHASE1_EVENTS) {
      expect(analyticsEventCategory(e)).toBeTruthy();
    }
  });

  it("logs validation summary", () => {
    // eslint-disable-next-line no-console
    console.info("[analytics-validation]", JSON.stringify(r, null, 2));
    expect(true).toBe(true);
  });
});
