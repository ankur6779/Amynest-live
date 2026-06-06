import { findImpactedFingerprints } from "./fingerprint-impact-map.js";
import { getHistoricalRiskForFile } from "./historical-risk.js";
import type { ChangedFileAnalysis } from "./types.js";
import { inferChangedComponentsAndHooks } from "./git-change-analyzer.js";

const LARGE_DIFF_LINES = 80;

export function analyzeChangedFile(input: {
  path: string;
  insertions: number;
  deletions: number;
}): ChangedFileAnalysis {
  const totalDelta = input.insertions + input.deletions;
  const impacted = findImpactedFingerprints([input.path]);
  const historical = getHistoricalRiskForFile(input.path);
  const inferred = inferChangedComponentsAndHooks([input.path]);

  const hasP0 = impacted.some((f) => f.severity === "P0");
  const hasP1 = impacted.some((f) => f.severity === "P1");
  const largeDiff = totalDelta >= LARGE_DIFF_LINES;

  let riskScore = 10;
  if (historical) {
    riskScore += historical.p0Incidents * 8 * (historical.riskMultiplier / 3);
  }
  if (hasP0) riskScore += 35;
  if (hasP1) riskScore += 20;
  if (largeDiff) riskScore += 15;
  if (impacted.length > 1) riskScore += 10;
  riskScore = Math.min(100, Math.round(riskScore));

  let riskLevel: ChangedFileAnalysis["riskLevel"] = "LOW";
  if (riskScore >= 75 || (hasP0 && largeDiff)) riskLevel = "CRITICAL";
  else if (riskScore >= 55 || hasP0) riskLevel = "HIGH";
  else if (riskScore >= 35 || hasP1) riskLevel = "MEDIUM";

  return {
    path: input.path,
    insertions: input.insertions,
    deletions: input.deletions,
    riskScore,
    riskLevel,
    impactedFingerprints: impacted.map((f) => f.readableFingerprint),
    components: [
      ...new Set([
        ...inferred.components,
        ...impacted.map((f) => f.component),
        ...(historical ? [historical.component] : []),
      ]),
    ],
    hooks: [
      ...new Set([...inferred.hooks, ...impacted.flatMap((f) => f.hooks)]),
    ],
    routes: [...new Set([...inferred.routes, ...impacted.map((f) => f.route)])],
    historicalP0Incidents: historical?.p0Incidents ?? 0,
    riskMultiplier: historical?.riskMultiplier ?? 1,
  };
}

export function analyzeAllChangedFiles(
  files: Array<{ path: string; insertions: number; deletions: number }>,
): ChangedFileAnalysis[] {
  return files
    .map(analyzeChangedFile)
    .sort((a, b) => b.riskScore - a.riskScore);
}

export function computeReleaseRiskScore(changed: ChangedFileAnalysis[]): number {
  if (changed.length === 0) return 0;
  const top = changed.slice(0, 5);
  const avg = top.reduce((s, f) => s + f.riskScore, 0) / top.length;
  const max = changed[0]?.riskScore ?? 0;
  return Math.min(100, Math.round(max * 0.6 + avg * 0.4));
}
