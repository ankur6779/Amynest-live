import type { ExperimentIntel } from "../growth-observatory/types.js";
import type { PricingExperimentAttribution } from "./types.js";

export function buildPricingExperimentAttribution(
  experiments: ExperimentIntel[],
): PricingExperimentAttribution[] {
  return experiments.map((exp) => {
    const insufficient = exp.insufficientSample || !exp.verified;
    const conf = exp.confidencePct ?? 0;
    const ctrl = exp.primaryMetricControl;
    const variant = exp.primaryMetricVariant;

    let decision: PricingExperimentAttribution["decision"];
    if (!exp.verified) decision = "not_enough_evidence";
    else if (insufficient) decision = "too_early";
    else if (exp.winningVariant === "variant" && conf >= 95) decision = "ship";
    else if (exp.winningVariant === "control" && conf >= 90) decision = "rollback";
    else decision = "continue";

    const conversionImpact =
      ctrl != null && variant != null
        ? `Control ${ctrl}% → Variant ${variant}%`
        : null;

    return {
      id: exp.id,
      name: exp.name,
      featureFlag: exp.featureFlag,
      revenueImpact:
        exp.primaryMetric.includes("purchase") || exp.primaryMetric.includes("routine")
          ? conversionImpact
          : "NOT VERIFIED — primary metric is not direct revenue",
      conversionImpact,
      retentionImpact: "NOT VERIFIED — retention not primary metric in experiment",
      confidencePct: conf,
      decision,
      evidence: exp.recommendedAction,
    };
  });
}
