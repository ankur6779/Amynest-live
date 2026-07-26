/**
 * Build EvaluationReport from scenario results.
 */

import {
  DEFAULT_MIN_OVERALL_SCORE,
  EVALUATION_FRAMEWORK_VERSION,
  type EngineScoreId,
  type EvaluationReport,
  type ScenarioResult,
} from "./types.js";

export function buildReport(input: {
  scenarioResults: ScenarioResult[];
  threshold?: number;
  previousOverall?: number | null;
}): EvaluationReport {
  const threshold = input.threshold ?? DEFAULT_MIN_OVERALL_SCORE;
  const results = input.scenarioResults;
  const overallScore =
    results.length === 0
      ? 0
      : Math.round(
          (results.reduce((s, r) => s + r.overallScore, 0) / results.length) * 10,
        ) / 10;

  const failedScenarios = results.filter((r) => !r.passed).map((r) => r.scenarioId);
  const warnings = [...new Set(results.flatMap((r) => r.warnings))];

  const perEngineScores = computePerEngineScores(results);

  const prev = input.previousOverall ?? null;
  let direction: EvaluationReport["trend"]["direction"] = "unknown";
  let delta: number | null = null;
  if (typeof prev === "number") {
    delta = Math.round((overallScore - prev) * 10) / 10;
    if (delta > 0.5) direction = "up";
    else if (delta < -0.5) direction = "down";
    else direction = "flat";
  }

  const passed = overallScore >= threshold && failedScenarios.length === 0;

  const summary = passed
    ? `PASS overall=${overallScore}/${threshold} scenarios=${results.length} failed=0`
    : `FAIL overall=${overallScore}/${threshold} failed=${failedScenarios.length}:${failedScenarios.join(",")}`;

  return {
    evaluationFrameworkVersion: EVALUATION_FRAMEWORK_VERSION,
    generatedAt: new Date().toISOString(),
    overallScore,
    threshold,
    passed,
    perEngineScores,
    scenarioResults: results,
    failedScenarios,
    warnings,
    trend: {
      direction,
      previousOverall: prev,
      delta,
    },
    summary,
  };
}

function computePerEngineScores(
  results: ScenarioResult[],
): Record<EngineScoreId, number> {
  const pick = (ids: string[]) => {
    const scores = results.flatMap((r) =>
      r.metrics.filter((m) => ids.includes(m.id)).map((m) => m.score),
    );
    if (!scores.length) return 0;
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
  };

  return {
    meaning: pick(["noHallucinatedAstronomy", "consistency"]),
    development: pick(["developmentAlignment", "completeness"]),
    adaptive: pick(["completeness", "parentUsefulness"]),
    conversation: pick(["conversationQuality", "safety", "readability"]),
    evidence: pick(["evidenceCoverage"]),
  };
}

export function formatReportText(report: EvaluationReport): string {
  const lines = [
    `AI Evaluation ${report.evaluationFrameworkVersion}`,
    report.summary,
    `Overall: ${report.overallScore} (threshold ${report.threshold})`,
    `Engines: ${Object.entries(report.perEngineScores)
      .map(([k, v]) => `${k}=${v}`)
      .join(" ")}`,
    `Trend: ${report.trend.direction}` +
      (report.trend.delta != null ? ` delta=${report.trend.delta}` : ""),
  ];
  if (report.warnings.length) {
    lines.push(`Warnings: ${report.warnings.slice(0, 12).join("; ")}`);
  }
  if (report.failedScenarios.length) {
    lines.push(`Failed: ${report.failedScenarios.join(", ")}`);
  }
  for (const s of report.scenarioResults) {
    lines.push(
      `  - ${s.scenarioId}: ${s.overallScore} ${s.passed ? "PASS" : "FAIL"} baseline=${String(s.baselineMatch)}`,
    );
  }
  return lines.join("\n");
}
