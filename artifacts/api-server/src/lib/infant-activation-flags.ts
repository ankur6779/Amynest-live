export type InfantActivationStepId = "feed" | "sleep" | "weight" | "cry";

const TOTAL_STEPS = 4;

export type InfantActivationFlags = {
  completedCount: number;
  completionRate: number;
  isEmptyState: boolean;
  isFullyActivated: boolean;
  showActivation: boolean;
};

export function computeInfantActivationFlags(
  steps: Record<InfantActivationStepId, boolean>,
  childAgeDays: number,
): InfantActivationFlags {
  const completedCount = Object.values(steps).filter(Boolean).length;
  const completionRate = Math.round((completedCount / TOTAL_STEPS) * 100);
  const isEmptyState = !steps.feed && !steps.sleep && !steps.weight && !steps.cry;
  const isFullyActivated = completedCount >= TOTAL_STEPS;
  const showActivation = !isFullyActivated && (isEmptyState || childAgeDays < 7);
  return { completedCount, completionRate, isEmptyState, isFullyActivated, showActivation };
}

export const INFANT_ACTIVATION_TOTAL_STEPS = TOTAL_STEPS;
