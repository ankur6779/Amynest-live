/**
 * Onboarding conversion experiment flags — env-driven rollout.
 * See docs/startup-funnel-telemetry.md for funnel SQL; enable via Render env.
 */

const SHORT_BRANCH_VARIANT_KEY = "amynest:onboarding_short_branch_variant:v1";

function envFlag(key: string, defaultValue = false): boolean {
  const raw = import.meta.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "true" || raw === "1";
}

/** When true, only explicit server onboardingComplete skips the chat flow. */
export function isOnboardingStrictCompleteGateEnabled(): boolean {
  return envFlag("VITE_FF_ONBOARDING_STRICT_COMPLETE_GATE", false);
}

/** Master switch for the short child-branch experiment. */
export function isOnboardingShortChildBranchExperimentEnabled(): boolean {
  return envFlag("VITE_FF_ONBOARDING_SHORT_CHILD_BRANCH", false);
}

export type OnboardingShortBranchVariant = "control" | "short";

function readStoredVariant(): OnboardingShortBranchVariant | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(SHORT_BRANCH_VARIANT_KEY);
  return raw === "short" || raw === "control" ? raw : null;
}

/** Stable 50/50 assignment for Experiment 1 (short child branch). */
export function resolveOnboardingShortBranchVariant(): OnboardingShortBranchVariant {
  if (!isOnboardingShortChildBranchExperimentEnabled()) return "control";
  const existing = readStoredVariant();
  if (existing) return existing;
  const variant: OnboardingShortBranchVariant = Math.random() < 0.5 ? "short" : "control";
  try {
    localStorage.setItem(SHORT_BRANCH_VARIANT_KEY, variant);
  } catch {
    /* ignore quota */
  }
  return variant;
}

export function isOnboardingShortChildBranchActive(): boolean {
  return resolveOnboardingShortBranchVariant() === "short";
}
