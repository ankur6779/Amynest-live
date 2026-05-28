/**
 * Continuous Optimization — Adaptive onboarding.
 *
 * Pure derivation of the first 3–5 minute experience. Reduces overwhelm,
 * creates quick wins, and personalizes immediately to age, premium state,
 * device performance tier, parent intent, and how much time the family has.
 *
 * IMPORTANT: This module is stateless. Hosts pass in their context and
 * receive a small, structured plan to render. No new engines, no new
 * dashboards, no parallel personalization.
 */

export type OnboardingMode =
  | "quick_start"
  | "calm_setup"
  | "first_session"
  | "five_minute";

export type PerformanceTierHint = "low" | "mid" | "high";

export type ParentIntent =
  | "early_learning"
  | "school_readiness"
  | "speech_support"
  | "calm_routine"
  | "premium_growth"
  | "unknown";

export interface AdaptiveOnboardingInput {
  /** Child's age in years. */
  childAge: number;
  /** Whether the family is on premium. */
  isPremium: boolean;
  /** What the parent told us during signup. */
  parentIntent?: ParentIntent;
  /** How much time the parent says they have today, in minutes. */
  availableMinutes?: number;
  /** Whether the parent indicated first-time anxiety. */
  firstTimeAnxiety?: boolean;
  /** Performance tier — drives motion + asset complexity. */
  performanceTier?: PerformanceTierHint;
  /** Child's name — for warm phrasing. */
  childName?: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  emoji: string;
  /** Approximate seconds for this step. */
  estimatedSeconds: number;
}

export interface AdaptiveOnboardingPlan {
  mode: OnboardingMode;
  steps: OnboardingStep[];
  reassuranceLine: string;
  successPromise: string;
  /** Whether to dial motion + visual complexity down. */
  calmVisuals: boolean;
  /** Estimated total length. */
  estimatedSeconds: number;
}

const NAME = (n?: string) => (n && n.trim() ? n : "your child");

function pickMode(input: AdaptiveOnboardingInput): OnboardingMode {
  if (input.firstTimeAnxiety) return "calm_setup";
  if ((input.availableMinutes ?? 6) <= 5) return "quick_start";
  if (input.availableMinutes != null && input.availableMinutes <= 8) return "five_minute";
  return "first_session";
}

function reassuranceFor(input: AdaptiveOnboardingInput, mode: OnboardingMode): string {
  if (input.firstTimeAnxiety) {
    return "Take your time. AmyNest works best in small, gentle steps.";
  }
  if (mode === "quick_start") {
    return "We'll set things up in under three minutes — no overwhelm.";
  }
  if (mode === "five_minute") {
    return "Five gentle minutes today is more than enough.";
  }
  return "Short, warm sessions are how confidence quietly grows.";
}

function successPromiseFor(input: AdaptiveOnboardingInput): string {
  const name = NAME(input.childName);
  if (input.parentIntent === "speech_support") {
    return `${name} will hear a small speaking win today.`;
  }
  if (input.parentIntent === "school_readiness") {
    return `${name} will have one easy, confidence-building moment today.`;
  }
  if (input.parentIntent === "calm_routine") {
    return `Today is about rhythm — one calm, finished moment with ${name}.`;
  }
  return `${name} will end this first session feeling successful.`;
}

function stepsFor(
  input: AdaptiveOnboardingInput,
  mode: OnboardingMode,
): OnboardingStep[] {
  const name = NAME(input.childName);
  const young = input.childAge <= 4;

  const welcome: OnboardingStep = {
    id: "welcome",
    title: `Hi from Amy${input.childName ? `, ${input.childName}` : ""}`,
    description: `A warm welcome and a gentle hello — nothing to do yet.`,
    emoji: "🌱",
    estimatedSeconds: 25,
  };

  const personalize: OnboardingStep = {
    id: "personalize",
    title: "A few cozy preferences",
    description: input.parentIntent
      ? `We'll shape today around what matters most to your family.`
      : `Tell us a little about ${name} — Amy listens.`,
    emoji: "🪄",
    estimatedSeconds: mode === "quick_start" ? 30 : 60,
  };

  const firstWin: OnboardingStep = {
    id: "first_win",
    title: young ? "One playful moment" : "A small first win",
    description: `A short, easy activity ${name} can finish in under a minute.`,
    emoji: young ? "🎈" : "⭐",
    estimatedSeconds: mode === "quick_start" ? 60 : 90,
  };

  const tomorrow: OnboardingStep = {
    id: "tomorrow",
    title: "Plant tomorrow's seed",
    description: `A tiny preview of what Amy has gently prepared for ${name} next.`,
    emoji: "🌤️",
    estimatedSeconds: 20,
  };

  if (mode === "quick_start") {
    return [welcome, firstWin];
  }
  if (mode === "calm_setup") {
    return [welcome, personalize];
  }
  if (mode === "five_minute") {
    return [welcome, personalize, firstWin];
  }
  return [welcome, personalize, firstWin, tomorrow];
}

export function buildAdaptiveOnboardingPlan(
  input: AdaptiveOnboardingInput,
): AdaptiveOnboardingPlan {
  const mode = pickMode(input);
  const steps = stepsFor(input, mode);
  const total = steps.reduce((sum, s) => sum + s.estimatedSeconds, 0);
  const calmVisuals =
    input.firstTimeAnxiety === true || input.performanceTier === "low";

  return {
    mode,
    steps,
    reassuranceLine: reassuranceFor(input, mode),
    successPromise: successPromiseFor(input),
    calmVisuals,
    estimatedSeconds: total,
  };
}

/**
 * Decide whether to suggest the parent skip a step right now. Used by the
 * onboarding UI to keep the experience calm and short.
 */
export function shouldOfferSkip(plan: AdaptiveOnboardingPlan, stepId: string): boolean {
  if (plan.mode === "quick_start") return true;
  if (plan.mode === "calm_setup" && stepId === "personalize") return true;
  return false;
}
