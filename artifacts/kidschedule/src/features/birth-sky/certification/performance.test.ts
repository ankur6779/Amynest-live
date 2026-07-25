/**
 * Performance certification — budget constants vs Pack 8 + Formation contracts.
 * Device mid-tier timings are WAIVED in PERFORMANCE_REPORT (lab pending).
 */
import { describe, expect, it } from "vitest";
import { PERFORMANCE_BUDGETS } from "./performance-budgets";
import {
  FORMATION_HARD_TIMEOUT_MS,
  FORMATION_MIN_CEREMONY_MS,
  REVEAL_CTA_ENABLE_MS,
} from "../constants/formation";

describe("IM-7 performance budgets", () => {
  it("matches Pack 8 Part 3 formation/reveal budgets", () => {
    expect(PERFORMANCE_BUDGETS.formationMinCeremonyMs).toBe(3200);
    expect(PERFORMANCE_BUDGETS.formationHardFailMs).toBe(15000);
    expect(PERFORMANCE_BUDGETS.revealCtaEnableMs).toBe(2000);
    expect(PERFORMANCE_BUDGETS.coldModuleOpenWelcomeMs).toBe(2500);
    expect(PERFORMANCE_BUDGETS.coldOpenDashboardCacheHitMs).toBe(3000);
    expect(PERFORMANCE_BUDGETS.warmSegmentSwitchMs).toBe(300);
    expect(PERFORMANCE_BUDGETS.offlineDashboardCacheHitMs).toBe(1500);
  });

  it("implementation constants align with certification budgets", () => {
    expect(FORMATION_MIN_CEREMONY_MS).toBe(PERFORMANCE_BUDGETS.formationMinCeremonyMs);
    expect(FORMATION_HARD_TIMEOUT_MS).toBe(PERFORMANCE_BUDGETS.formationHardFailMs);
    expect(REVEAL_CTA_ENABLE_MS).toBe(PERFORMANCE_BUDGETS.revealCtaEnableMs);
  });

  it("regression tolerance is 20%", () => {
    expect(PERFORMANCE_BUDGETS.regressionToleranceRatio).toBe(0.2);
  });
});
