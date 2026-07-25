/**
 * Pack 8 Part 3 performance budgets — certification targets (not new product behavior).
 */

export const PERFORMANCE_BUDGETS = {
  coldModuleOpenWelcomeMs: 2500,
  coldOpenDashboardCacheHitMs: 3000,
  warmSegmentSwitchMs: 300,
  formationMinCeremonyMs: 3200,
  formationHardFailMs: 15000,
  revealCtaEnableMs: 2000,
  offlineDashboardCacheHitMs: 1500,
  /** Regression gate: fail if >20% over budget without waiver (Pack 8 §3.2). */
  regressionToleranceRatio: 0.2,
} as const;

export type PerformanceBudgetKey = keyof typeof PERFORMANCE_BUDGETS;

export type PerformanceMeasurement = {
  metric: string;
  budgetMs: number;
  measuredMs: number | null;
  status: "PASS" | "FAIL" | "WAIVED" | "NOT_APPLICABLE";
  evidence: string;
  notes?: string;
};
