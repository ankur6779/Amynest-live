/**
 * DEV-only host for Amy Learning reliability chaos suite.
 * No UI — logs a reliability report to the console.
 * Production builds never import this from GrowthBootstrap without DEV gate.
 */

import type { ReliabilityReport } from "@workspace/learning-reliability";

let lastReport: ReliabilityReport | null = null;

export function isLearningReliabilityHostEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("learningChaos") === "1") return true;
    return localStorage.getItem("__amynest_learning_chaos") === "1";
  } catch {
    return false;
  }
}

/**
 * Dynamically run the chaos suite and print the report.
 * Safe to call from DEV consoles: `window.__amynestRunLearningChaos?.()`
 */
export async function runLearningReliabilityHost(): Promise<ReliabilityReport | null> {
  if (!import.meta.env.DEV) return null;
  const mod = await import("@workspace/learning-reliability");
  const report = mod.runLearningChaosSuite();
  lastReport = report;
  // Observability: recovery actions
  for (const action of report.recoveryReport.actions) {
    console.info("[learning-reliability:repair]", {
      reason: action.reason,
      actions: action.actions,
      durationMs: action.durationMs,
      dataLossRisk: action.dataLossRisk,
      at: action.at,
    });
  }
  console.info(mod.formatReliabilityReport(report));
  return report;
}

export function getLastLearningReliabilityReport(): ReliabilityReport | null {
  return lastReport;
}

export function installLearningReliabilityHost(): void {
  if (!import.meta.env.DEV) return;
  if (typeof window === "undefined") return;
  (
    window as Window & {
      __amynestRunLearningChaos?: () => Promise<ReliabilityReport | null>;
    }
  ).__amynestRunLearningChaos = runLearningReliabilityHost;

  if (isLearningReliabilityHostEnabled()) {
    void runLearningReliabilityHost();
  }
}
