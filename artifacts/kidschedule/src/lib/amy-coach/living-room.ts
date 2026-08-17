/**
 * Amy Coach Phase 2 — living room helpers.
 * Presentation only. AI / prompts / conversation / memory / APIs / entitlements untouched.
 *
 * Emotional target: "Amy is beside me."
 * Never chatbot, AI demo, support desk, prompt playground, SaaS dashboard, marketplace.
 */

import { resolvePortfolioLivingFlag } from "@/lib/amynest-living-universe";

export type AmyCoachRecommend = {
  id: "begin";
  label: string;
  title: string;
  purpose: string;
};

export type AmyCoachQuietPath = {
  id: "concern" | "for-you" | "continue";
  title: string;
  purpose: string;
};

export type AmyCoachLivingOpen = {
  eyebrow: string;
  title: string;
  purpose: string;
  companionship: string;
};

/** Quiet ways to begin — never a feature catalogue. */
export const AMY_COACH_QUIET_PATHS: readonly AmyCoachQuietPath[] = [
  {
    id: "concern",
    title: "A concern today",
    purpose: "Begin with what feels heavy",
  },
  {
    id: "for-you",
    title: "For you",
    purpose: "When you're carrying a lot",
  },
  {
    id: "continue",
    title: "Where we left off",
    purpose: "Return quietly to your plan",
  },
] as const;

/** One natural invitation — not a mode picker. */
export function recommendAmyCoachAction(
  childName = "your child",
): AmyCoachRecommend {
  return {
    id: "begin",
    label: "Start here",
    title: `I'm beside you with ${childName}`,
    purpose: "One calm place to begin — no setup required",
  };
}

/** Companionship open — same house as Ask Amy / Guidance. */
export function amyCoachLivingOpen(childName = "your child"): AmyCoachLivingOpen {
  return {
    eyebrow: "Beside you",
    title: `I'm here with you and ${childName}.`,
    purpose: "Guided support for a real parenting concern — calm, never spectacle.",
    companionship: `Amy is beside you and ${childName}.`,
  };
}

/** Living product face — place of life, not SKU theatre. */
export function livingAmyCoachProductName(): string {
  return isAmyCoachLivingV1Enabled() ? "Beside you" : "Amy Coach";
}

export function livingAmyCoachProductShort(): string {
  return isAmyCoachLivingV1Enabled() ? "Beside you" : "Amy Coach";
}

export function livingAmyCoachNavLabel(): string {
  return isAmyCoachLivingV1Enabled() ? "Beside you" : "Amy Coach";
}

export function livingAmyCoachNavDescription(): string {
  return isAmyCoachLivingV1Enabled()
    ? "Amy beside you — one calm next step"
    : "Learning goals & progress";
}

export function livingAmyCoachTagline(): string {
  return isAmyCoachLivingV1Enabled()
    ? "Amy is beside you — guided, never watching"
    : "Your AI parenting coach";
}

export function livingGoalLockedCta(): string {
  return "Continue with the complete Coach experience";
}

export function livingGoalOpenCta(): string {
  return "Begin gently →";
}

export function livingTryFreeBadge(): string {
  return "Start free";
}

export function livingPremiumBadge(): string {
  return "Whenever you're ready";
}

export function livingCatalogBannerTitle(): string {
  return "Every topic is here when you need it";
}

export function livingCatalogBannerBody(): string {
  return "Begin with one concern. We can keep helping whenever you're ready.";
}

export function livingGenerateCta(): string {
  return "Begin the first small win";
}

export function livingLoadingHeadline(): string {
  return "Amy is preparing a gentle next step…";
}

export function livingProgressTitle(): string {
  return "Where we left off";
}

export function livingProgressSubtitle(): string {
  return "Return to your plan anytime — nothing is lost.";
}

export function livingInsightLabel(): string {
  return "A quiet note from Amy";
}

export function livingUnderstandingTitle(): string {
  return "What I'm hearing";
}

/** Flag — Amy Coach living room manufacturing. Default ON. */
export function isAmyCoachLivingV1Enabled(): boolean {
  return resolvePortfolioLivingFlag(import.meta.env.VITE_FF_AMY_COACH_LIVING_V1);
}
