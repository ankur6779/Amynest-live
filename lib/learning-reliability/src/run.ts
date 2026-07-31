import { ALL_SCENARIO_RUNNERS, SCENARIO_REGISTRY } from "./scenarios.js";
import { buildReliabilityReport } from "./score.js";
import type { FailureKind, ReliabilityReport, ScenarioResult } from "./types.js";

export type ChaosSuiteOptions = {
  /** Subset of scenario ids to run; default all. */
  only?: FailureKind[];
  onScenario?: (result: ScenarioResult) => void;
};

/**
 * Run the full Amy Learning Platform chaos suite.
 * Pure / in-memory — safe for CI and DEV consoles. No UI.
 */
export function runLearningChaosSuite(
  options: ChaosSuiteOptions = {},
): ReliabilityReport {
  const selected = options.only?.length
    ? options.only.map((id) => SCENARIO_REGISTRY[id]).filter(Boolean)
    : ALL_SCENARIO_RUNNERS;

  const scenarios: ScenarioResult[] = [];
  for (const run of selected) {
    const result = run();
    options.onScenario?.(result);
    scenarios.push(result);
  }
  return buildReliabilityReport(scenarios);
}

/** Pretty console reporter for DEV / CI. */
export function formatReliabilityReport(report: ReliabilityReport): string {
  const lines: string[] = [];
  lines.push("=== Amy Learning Platform — Reliability Report ===");
  lines.push(report.summary);
  lines.push("");
  lines.push("Failure matrix:");
  for (const row of report.failureMatrix) {
    lines.push(
      `  [${row.status.padEnd(6)}] ${row.failure.padEnd(22)} risk=${row.dataLossRisk.padEnd(6)} failedDomains=${row.domainsFailed.join(",") || "-"}`,
    );
  }
  lines.push("");
  lines.push(
    `Recovery: ${report.recoveryReport.totalRepairs} actions · avg ${report.recoveryReport.averageRepairMs}ms · highRisk=${report.recoveryReport.highRiskRepairs}`,
  );
  if (report.suggestedFixes.length) {
    lines.push("Suggested fixes:");
    for (const fix of report.suggestedFixes) {
      lines.push(`  - ${fix}`);
    }
  }
  lines.push(
    `Cloud reconciliation ready: ${report.cloudReconciliationReady ? "YES" : "NO"}`,
  );
  return lines.join("\n");
}
