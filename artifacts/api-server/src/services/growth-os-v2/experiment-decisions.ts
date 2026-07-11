import type { ExperimentIntel } from "../growth-observatory/types.js";
import type { ExperimentDecision } from "./types.js";
import { MIN_EXPERIMENT_PER_ARM, validateEvidence } from "./safety.js";

export function decideExperiments(experiments: ExperimentIntel[]): ExperimentDecision[] {
  return experiments.map((exp) => {
    const sampleSize = { control: exp.controlUsers, variant: exp.variantUsers };
    const insufficient = exp.insufficientSample || !exp.verified;
    const conf = exp.confidencePct ?? 0;

    let decision: ExperimentDecision["decision"];
    let recommendedAction: string;

    if (!exp.verified) {
      decision = "not_enough_evidence";
      recommendedAction = "NOT ENOUGH EVIDENCE — no experiment telemetry in window.";
    } else if (insufficient) {
      decision = "too_early";
      recommendedAction = `Continue — need ≥${MIN_EXPERIMENT_PER_ARM} users per arm (control=${exp.controlUsers}, variant=${exp.variantUsers}).`;
    } else if (conf < 90 || exp.winningVariant === "inconclusive" || exp.winningVariant === null) {
      decision = "continue";
      recommendedAction = exp.recommendedAction || "Continue experiment until 90%+ confidence.";
    } else if (exp.winningVariant === "variant" && conf >= 95) {
      decision = "ship";
      recommendedAction = `Ship variant — ${conf}% confidence on ${exp.primaryMetric}.`;
    } else if (exp.winningVariant === "control" && conf >= 90) {
      decision = "rollback";
      recommendedAction = `Rollback variant — control wins on ${exp.primaryMetric} at ${conf}% confidence.`;
    } else if (exp.winningVariant === "variant") {
      decision = "continue";
      recommendedAction = "Variant leading but confidence below ship threshold — continue.";
    } else {
      decision = "continue";
      recommendedAction = exp.recommendedAction;
    }

    const status = validateEvidence({
      verified: exp.verified,
      users: exp.controlUsers + exp.variantUsers,
      confidence: insufficient ? 40 : conf,
      minUsers: MIN_EXPERIMENT_PER_ARM * 2,
      minConfidence: decision === "ship" || decision === "rollback" ? 90 : 60,
    });

    return {
      id: exp.id,
      name: exp.name,
      featureFlag: exp.featureFlag,
      sampleSize,
      primaryMetric: exp.primaryMetric,
      confidencePct: exp.confidencePct,
      winningVariant: exp.winningVariant,
      decision,
      recommendedAction,
      status,
    };
  });
}
