import type {
  FailureFlag,
  LayerValidationResult,
  SystemMetrics,
  SystemValidationReport,
} from "./simulationTypes.js";
import {
  collectFailureFlags,
  computeSystemMetrics,
  validateAllLayers,
} from "./systemValidation.js";
import {
  runFullSystemSimulation,
  runOptimizationComparison,
  SIM_CHILD_PROFILES,
} from "./systemSimulation.js";
import type { FullSimulationResult } from "./simulationTypes.js";

export function formatLayerLine(result: LayerValidationResult): string {
  const icon =
    result.status === "pass" ? "✅" : result.status === "warn" ? "⚠️" : "❌";
  return `${result.layer} ${icon}`;
}

export function formatSystemReport(report: SystemValidationReport): string {
  const lines: string[] = [
    "",
    "═══════════════════════════════════════════════════════════",
    `  CONTENT ORCHESTRATION SYSTEM REPORT — ${report.overall}`,
    "═══════════════════════════════════════════════════════════",
    "",
    "Layer validation:",
  ];

  for (const l of report.layers) {
    lines.push(`  ${formatLayerLine(l)}`);
    lines.push(`    ${l.message}`);
    if (l.details?.length) {
      for (const d of l.details.slice(0, 4)) {
        lines.push(`      · ${d}`);
      }
    }
  }

  lines.push(
    "",
    "System metrics:",
    `  Avg Engagement Score:      ${report.metrics.avgEngagementScore.toFixed(1)}`,
    `  Avg Reward Trend:          ${report.metrics.avgRewardTrend >= 0 ? "+" : ""}${report.metrics.avgRewardTrend.toFixed(3)}`,
    `  ML Usage Rate:             ${(report.metrics.mlUsageRatio * 100).toFixed(1)}% (ml: ${report.metrics.mlVsRuleBreakdown.ml}, rule: ${report.metrics.mlVsRuleBreakdown.rule})`,
    `  ML Lift:                   ${report.metrics.mlLift >= 0 ? "+" : ""}${report.metrics.mlLift.toFixed(4)}`,
    `  Difficulty-Adjusted Lift:  ${report.metrics.difficultyAdjustedLift >= 0 ? "+" : ""}${report.metrics.difficultyAdjustedLift.toFixed(4)}`,
    `  Decision Consistency:      ${report.metrics.decisionConsistencyScore.toFixed(2)}`,
    `  UX Proxy Score:            ${report.metrics.uxScore.toFixed(2)}`,
    `  Reward Variance:           ${report.metrics.rewardVariance.toFixed(4)}`,
    `  Adaptation Delay (ms):     ${report.metrics.avgAdaptationDelayMs.toFixed(0)}`,
    `  Burst Noise Stability:     ${report.metrics.burstNoiseStabilityScore.toFixed(2)}`,
    `  Underreaction Rate:        ${(report.metrics.underreactionRate * 100).toFixed(1)}%`,
    `  Stability Delta (V10):     ${report.metrics.stabilityDelta >= 0 ? "+" : ""}${report.metrics.stabilityDelta.toFixed(3)}`,
    `  Personality Impact:        ${report.metrics.personalityImpactScore.toFixed(2)}`,
    `  Noise Robustness:          ${report.metrics.noiseRobustnessScore.toFixed(2)}`,
    `  Adaptation Latency:        ${report.metrics.avgAdaptationLatency.toFixed(2)} events`,
    `  Overreaction Rate:         ${(report.metrics.overreactionRate * 100).toFixed(1)}%`,
    `  Trait Stability:           ${report.metrics.traitStability.toFixed(4)}`,
    `  Direction Accuracy:        ${(report.metrics.directionAccuracy * 100).toFixed(1)}%`,
    `  Session Coherence:         ${report.metrics.coherenceScore.toFixed(2)}`,
    `  Prediction Error (est.):   ${report.metrics.predictionError.toFixed(2)}`,
    `  Drop-off Reduction:        ${report.metrics.dropOffReductionPct.toFixed(1)}%`,
    `  Exploration Effectiveness: ${(report.metrics.explorationEffectiveness * 100).toFixed(1)}%`,
    `  Simulation duration:       ${report.simulation.durationMs}ms`,
  );

  if (report.flags.length > 0) {
    lines.push("", "Failure flags:");
    for (const f of report.flags) {
      lines.push(`  [${f.severity}] ${f.code}: ${f.message}`);
    }
  }

  if (report.suggestions.length > 0) {
    lines.push("", "Suggestions:");
    for (const s of report.suggestions) {
      lines.push(`  → ${s}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

export function buildSystemValidationReport(
  simulation: FullSimulationResult,
): SystemValidationReport {
  const optimization = simulation.optimizationComparison;
  const layers = validateAllLayers(simulation, optimization);
  const metrics = computeSystemMetrics(simulation);
  const flags = collectFailureFlags(layers, metrics, optimization);

  const suggestions = layers
    .filter((l) => l.suggestions?.length)
    .flatMap((l) => l.suggestions!);

  const criticalFails = layers.filter((l) => l.status === "fail").length;
  const overall: SystemValidationReport["overall"] =
    criticalFails > 0 || flags.some((f) => f.severity === "critical")
      ? "FAIL"
      : "PASS";

  return {
    overall,
    layers,
    metrics,
    flags,
    suggestions: [...new Set(suggestions)],
    simulation,
  };
}

/**
 * Run full simulation + validation and return structured report.
 */
export async function runFullSystemValidation(options?: {
  skipOptimizationComparison?: boolean;
  mlMode?: import("./simulationTypes.js").SimMlMode;
  injectNoise?: boolean;
  simulateLatency?: boolean;
  burstNoiseMode?: boolean;
}): Promise<SystemValidationReport> {
  const simulation = await runFullSystemSimulation({
    mlMode: options?.mlMode ?? "balanced",
    injectNoise: options?.injectNoise ?? false,
    simulateLatency: options?.simulateLatency ?? false,
    burstNoiseMode: options?.burstNoiseMode ?? false,
    skipMetaLayer: true,
  });
  if (!options?.skipOptimizationComparison) {
    simulation.optimizationComparison = await runOptimizationComparison(
      SIM_CHILD_PROFILES.slice(0, 2),
    );
  }
  return buildSystemValidationReport(simulation);
}

export function printSystemReport(report: SystemValidationReport): void {
  console.log(formatSystemReport(report));
}
