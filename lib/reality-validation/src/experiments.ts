import type { ExperimentArm } from "./types.js";

export interface ExperimentValidationResult {
  experimentId: string;
  control: ExperimentArm;
  treatment: ExperimentArm;
  upliftPct: number;
  significant: boolean;
  recommendation: "continue_treatment" | "revert_to_control" | "needs_more_data";
}

export function validateExperiment(
  control: ExperimentArm,
  treatment: ExperimentArm,
): ExperimentValidationResult {
  const controlRate = control.sent > 0 ? control.attributedOutcomes / control.sent : 0;
  const treatmentRate = treatment.sent > 0 ? treatment.attributedOutcomes / treatment.sent : 0;
  const upliftPct =
    controlRate > 0
      ? Math.round(((treatmentRate - controlRate) / controlRate) * 100)
      : treatmentRate > 0
        ? 100
        : 0;

  const minSample = 30;
  const significant =
    control.sent >= minSample &&
    treatment.sent >= minSample &&
    Math.abs(upliftPct) >= 10;

  let recommendation: ExperimentValidationResult["recommendation"];
  if (control.sent < minSample || treatment.sent < minSample) {
    recommendation = "needs_more_data";
  } else if (upliftPct >= 10) {
    recommendation = "continue_treatment";
  } else if (upliftPct <= -5) {
    recommendation = "revert_to_control";
  } else {
    recommendation = "needs_more_data";
  }

  return {
    experimentId: control.experimentId,
    control,
    treatment,
    upliftPct,
    significant,
    recommendation,
  };
}
