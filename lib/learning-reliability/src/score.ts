import type {
  DataLossRisk,
  FailureMatrixRow,
  ReliabilityReport,
  ScenarioResult,
} from "./types.js";
import { LEARNING_RELIABILITY_SCHEMA_VERSION } from "./types.js";

function riskRank(r: DataLossRisk): number {
  return r === "high" ? 3 : r === "medium" ? 2 : r === "low" ? 1 : 0;
}

function worstRisk(scenario: ScenarioResult): DataLossRisk {
  let worst: DataLossRisk = "none";
  for (const repair of scenario.repairs) {
    if (riskRank(repair.dataLossRisk) > riskRank(worst)) {
      worst = repair.dataLossRisk;
    }
  }
  return worst;
}

export function buildFailureMatrix(scenarios: ScenarioResult[]): FailureMatrixRow[] {
  return scenarios.map((s) => ({
    failure: s.id,
    status: s.status,
    recovered: s.status === "pass" || s.status === "healed" || s.status === "warn",
    dataLossRisk: worstRisk(s),
    domainsFailed: s.checks.filter((c) => !c.ok).map((c) => c.domain),
  }));
}

/**
 * Score 0–100.
 * pass=full, healed=near-full, warn=partial, fail=0 for that scenario.
 */
export function computeReliabilityScore(scenarios: ScenarioResult[]): number {
  if (!scenarios.length) return 0;
  let points = 0;
  for (const s of scenarios) {
    if (s.status === "pass") points += 100;
    else if (s.status === "healed") points += 90;
    else if (s.status === "warn") points += 70;
    else points += 0;
  }
  return Math.round(points / scenarios.length);
}

export function buildReliabilityReport(
  scenarios: ScenarioResult[],
): ReliabilityReport {
  const failureMatrix = buildFailureMatrix(scenarios);
  const actions = scenarios.flatMap((s) => s.repairs);
  const highRiskRepairs = actions.filter((a) => a.dataLossRisk === "high").length;
  const averageRepairMs = actions.length
    ? actions.reduce((sum, a) => sum + a.durationMs, 0) / actions.length
    : 0;
  const suggestedFixes = [
    ...new Set(scenarios.flatMap((s) => s.suggestedFixes)),
  ];
  const score = computeReliabilityScore(scenarios);
  const cloudReady = scenarios.every((s) =>
    s.checks
      .filter((c) => c.domain === "cloud_reconciliation")
      .every((c) => c.ok),
  );
  const failed = scenarios.filter((s) => s.status === "fail").length;
  const healed = scenarios.filter((s) => s.status === "healed").length;

  return {
    schemaVersion: LEARNING_RELIABILITY_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    reliabilityScore: score,
    scenarios,
    failureMatrix,
    recoveryReport: {
      totalRepairs: actions.length,
      highRiskRepairs,
      averageRepairMs: Number(averageRepairMs.toFixed(3)),
      actions,
    },
    suggestedFixes,
    cloudReconciliationReady: cloudReady,
    summary: `Reliability ${score}/100 · ${scenarios.length} scenarios · ${failed} failed · ${healed} healed · cloudReady=${cloudReady}`,
  };
}
