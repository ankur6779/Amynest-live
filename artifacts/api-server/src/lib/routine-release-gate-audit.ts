/**
 * Release gate integrity audit — detects inflated pass rates without loosening validators.
 */
import { differenceScore, routineStructureDifferenceScore } from "./routine-country-structure.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";

export type ScenarioResultLike = {
  pass: boolean;
  warnings?: string[];
  severity?: string | null;
};

export type ReleaseGateAuditInput = {
  results: ScenarioResultLike[];
  releaseGate?: {
    gatePass?: boolean;
    mealFlowFailures?: number;
    culturalFailures?: number;
    mealFlowFailureCap?: number;
    culturalFailureCap?: number;
  };
  countrySignatures?: Array<{
    country: string;
    items: RoutineScheduleItem[];
  }>;
};

export type ReleaseGateAuditReport = {
  realQualityScore: number;
  validatorScore: number;
  gateIntegrityScore: number;
  countryDifferentiationScore: number;
  countryPairScores: Array<{ a: string; b: string; structure: number; template: number }>;
  findings: string[];
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Verify gate is not passing via warning-only hiding or saturated failure caps.
 */
export function auditReleaseGateIntegrity(
  input: ReleaseGateAuditInput,
): ReleaseGateAuditReport {
  const findings: string[] = [];
  const total = input.results.length || 1;
  const passed = input.results.filter((r) => r.pass).length;
  const withWarnings = input.results.filter((r) => (r.warnings?.length ?? 0) > 0);
  const warningOnlyPass = input.results.filter(
    (r) => r.pass && (r.warnings?.length ?? 0) > 0,
  ).length;

  const mealFlowWarn = input.results.filter((r) =>
    (r.warnings ?? []).some((w) => String(w).startsWith("meal-flow:")),
  ).length;
  const culturalWarn = input.results.filter((r) =>
    (r.warnings ?? []).some((w) => String(w).startsWith("cultural:")),
  ).length;
  const trustWarn = input.results.filter((r) =>
    (r.warnings ?? []).some((w) => String(w).startsWith("trust-")),
  ).length;

  const gate = input.releaseGate;
  const mealCap = gate?.mealFlowFailureCap ?? 5;
  const cultCap = gate?.culturalFailureCap ?? 5;
  const mealAtCap = (gate?.mealFlowFailures ?? mealFlowWarn) >= mealCap;
  const cultNearCap = (gate?.culturalFailures ?? culturalWarn) >= cultCap - 1;

  if (warningOnlyPass > total * 0.4) {
    findings.push(
      `${warningOnlyPass}/${total} scenarios pass with warnings — pass rate may overstate quality`,
    );
  }
  if (mealAtCap) {
    findings.push(`meal-flow failures at cap (${gate?.mealFlowFailures ?? mealFlowWarn}/${mealCap})`);
  }
  if (cultNearCap) {
    findings.push(`cultural failures near cap (${gate?.culturalFailures ?? culturalWarn}/${cultCap})`);
  }
  if (trustWarn > 0) {
    findings.push(`${trustWarn} scenarios with trust-validator warnings`);
  }

  const cleanPassRate = (passed - warningOnlyPass * 0.5) / total;
  const realQualityScore = Math.round(clamp01(cleanPassRate) * 1000) / 100;

  const validatorMeaning =
    1 -
    clamp01(mealFlowWarn / total) * 0.3 -
    clamp01(culturalWarn / total) * 0.3 -
    clamp01(trustWarn / total) * 0.4;
  const validatorScore = Math.round(validatorMeaning * 1000) / 100;

  let gateIntegrityScore = gate?.gatePass ? 0.85 : 0.4;
  if (mealAtCap) gateIntegrityScore -= 0.2;
  if (warningOnlyPass > total * 0.5) gateIntegrityScore -= 0.15;
  if (trustWarn > 0) gateIntegrityScore -= 0.1;
  gateIntegrityScore = Math.round(clamp01(gateIntegrityScore) * 1000) / 100;

  const pairScores: ReleaseGateAuditReport["countryPairScores"] = [];
  const sigs = input.countrySignatures ?? [];
  const structScores: number[] = [];
  const templateScores: number[] = [];

  for (let i = 0; i < sigs.length; i++) {
    for (let j = i + 1; j < sigs.length; j++) {
      const structure = routineStructureDifferenceScore(
        sigs[i]!.items,
        sigs[j]!.items,
      );
      const template = differenceScore(sigs[i]!.country, sigs[j]!.country);
      structScores.push(structure);
      templateScores.push(template);
      pairScores.push({
        a: sigs[i]!.country,
        b: sigs[j]!.country,
        structure: Math.round(structure * 1000) / 1000,
        template: Math.round(template * 1000) / 1000,
      });
    }
  }

  const avgStruct =
    structScores.length > 0
      ? structScores.reduce((a, b) => a + b, 0) / structScores.length
      : 0;
  const avgTemplate =
    templateScores.length > 0
      ? templateScores.reduce((a, b) => a + b, 0) / templateScores.length
      : 0;
  const countryDifferentiationScore =
    Math.round(((avgStruct * 0.6 + avgTemplate * 0.4) * 10) * 10) / 100;

  if (avgStruct < 0.08 && sigs.length > 1) {
    findings.push("country structure scores below 0.08 — outputs may be too similar");
  }

  return {
    realQualityScore,
    validatorScore,
    gateIntegrityScore,
    countryDifferentiationScore,
    countryPairScores: pairScores,
    findings,
  };
}
