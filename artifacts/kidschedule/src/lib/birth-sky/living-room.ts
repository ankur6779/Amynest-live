/**
 * Birth Sky Phase 2 — living room hierarchy helpers.
 * Presentation only. No engine / calculation / intelligence / API / DB changes.
 *
 * Emotional target: UNDERSTAND — another room in the AmyNest home.
 * Never astrology app, prediction, horoscope, cosmic dashboard, SaaS, marketplace.
 */

import { resolvePortfolioLivingFlag } from "@/lib/amynest-living-universe";

export type BirthSkyRecommend = {
  id: "begin";
  label: string;
  title: string;
  purpose: string;
};

export type BirthSkyQuietPath = {
  id: "portrait" | "patterns" | "reflect";
  title: string;
  purpose: string;
};

export type BirthSkyLivingOpen = {
  eyebrow: string;
  title: string;
  purpose: string;
  companionship: string;
};

/** Quiet understanding paths — not a feature mall. */
export const BIRTH_SKY_QUIET_PATHS: readonly BirthSkyQuietPath[] = [
  {
    id: "portrait",
    title: "Soft portrait",
    purpose: "See who they are — gently",
  },
  {
    id: "patterns",
    title: "Gentle patterns",
    purpose: "Notice temperament without labels",
  },
  {
    id: "reflect",
    title: "Reflect with Amy",
    purpose: "Ask when you're ready — never fate",
  },
] as const;

/** One recommended Understand act for a tired parent. */
export function recommendBirthSkyAction(): BirthSkyRecommend {
  return {
    id: "begin",
    label: "Start here",
    title: "See them more clearly",
    purpose: "One calm step into soft understanding",
  };
}

/** Companionship open — same house as Guidance / Moments. */
export function birthSkyLivingOpen(childName = "your child"): BirthSkyLivingOpen {
  return {
    eyebrow: "Today's Understanding",
    title: `What helps you understand ${childName}?`,
    purpose: "Soft identity — reflective, never fate.",
    companionship: `I'm here with you and ${childName}.`,
  };
}

/** Living product face — never Amy Astro Intelligence / cosmic SKU. */
export function livingBirthSkyProductName(): string {
  return isBirthSkyLivingV1Enabled() ? "Birth Sky" : "Amy Astro Intelligence";
}

export function livingBirthSkyProductShort(): string {
  return isBirthSkyLivingV1Enabled() ? "Birth Sky" : "Amy Astro";
}

export function livingBirthSkyTagline(): string {
  return isBirthSkyLivingV1Enabled()
    ? "Soft identity · reflective parenting insight · never a prediction"
    : "Your child's cosmic portrait · Birth Sky · Soft parenting insights";
}

export function livingFormationCopy(elapsedMs: number, hardTimeoutMs: number): string {
  if (elapsedMs > 0 && elapsedMs < hardTimeoutMs) {
    return "Gathering a quiet understanding…";
  }
  return "Almost ready…";
}

export function livingRevealCta(): string {
  return "Continue quietly";
}

export function livingReviewTitle(): string {
  return "Review gently";
}

export function livingCreateCta(childName: string): string {
  return `Continue with ${childName}`;
}

export function livingPremiumPdfCta(): string {
  return "Continue with Premium whenever you're ready";
}

export function livingDashboardEditionLabel(): string {
  return "Birth Sky · soft understanding";
}

export function livingLoadingCopy(): string {
  return "Preparing a quiet understanding…";
}

/** Flag — Birth Sky living room manufacturing. Portfolio lock: FA-02. */
export function isBirthSkyLivingV1Enabled(): boolean {
  return resolvePortfolioLivingFlag(import.meta.env.VITE_FF_BIRTH_SKY_LIVING_V1);
}

/** Calm deep-interior materials — same house as Understand / Grow / Health deep. */
export const BIRTH_SKY_LIVING_DEEP_PALETTE = {
  sand: "rgba(232,212,184,0.95)",
  sandBorder: "rgba(232,212,184,0.28)",
  night: "#120e18",
  textBright: "rgba(255,252,248,0.96)",
} as const;

export function livingDashboardTitle(): string {
  return livingBirthSkyProductName();
}

export function livingLeaveEyebrow(): string {
  return "Today's Understanding";
}

export function livingHeroAskAmyCta(): string {
  return "Reflect with Amy";
}

export function livingHeroPrimaryFallbackCta(): string {
  return "Continue gently";
}

export function livingSegmentNavAria(): string {
  return "Understanding sections";
}

export function livingErrorLoadCopy(): string {
  return "We couldn't open this understanding just now.";
}

export function livingErrorExitCta(): string {
  return "Back to Parent Hub";
}

export function livingSettingsAboutTitle(): string {
  return "About Birth Sky";
}

export function livingDeleteConfirmTitle(): string {
  return "Remove Birth Sky data?";
}

export function livingConsentBodyLine(): string {
  return "Birth details stay on your account for Birth Sky only. Parent-only. Never for ads.";
}

export function livingConsentRemoveLine(): string {
  return "You can remove Birth Sky data later in Settings.";
}

export function livingChildConfirmTitle(childName: string): string {
  return `Whose Birth Sky — ${childName}?`;
}

export function livingBrandAvatarAria(): string {
  return isBirthSkyLivingV1Enabled() ? "Birth Sky" : "Amy Astro Intelligence";
}

export function livingUnavailableCopy(): string {
  return "Birth Sky isn't available for this child yet.";
}

export function livingUpdateDetailsCta(): string {
  return "Update birth details";
}

/** Soften journey/universe CTA verbs when living — never destiny theatre. */
export function livingSoftCta(raw: string): string {
  const t = raw.trim();
  if (!t) return livingHeroPrimaryFallbackCta();
  const lower = t.toLowerCase();
  if (lower.includes("universe") || lower.includes("destiny") || lower.includes("journey →")) {
    return livingHeroPrimaryFallbackCta();
  }
  if (lower.startsWith("enter the") || lower.includes("living sky")) {
    return livingRevealCta();
  }
  if (lower.includes("continue your journey") || lower.includes("wander a little")) {
    return livingHeroPrimaryFallbackCta();
  }
  if (lower.includes("open today's chapter") || lower.includes("open today’s chapter")) {
    return "Continue gently";
  }
  return t;
}

/** Segment tabs — calm Understand labels (ids unchanged). */
export function livingSegmentLabel(
  id: "sky" | "astronomy" | "tradition" | "reflect",
): string {
  switch (id) {
    case "sky":
      return "Home";
    case "astronomy":
      return "Sky";
    case "tradition":
      return "Patterns";
    case "reflect":
      return "Reflect";
  }
}

export function livingProgressTitle(): string {
  return "Gentle noticing";
}

export function livingProgressNextLabel(): string {
  return "Next quiet path";
}

export function livingProgressAria(): string {
  return "Understanding progress";
}

export function livingRegenLoadingCopy(): string {
  return livingLoadingCopy();
}

export function livingAskAmySheetTitle(): string {
  return livingHeroAskAmyCta();
}

export function livingCompletionLine(childName: string): string {
  return `You now hold a softer understanding of ${childName}.`;
}

export function livingDaySkyTimeHint(): string {
  return "Without an exact time we map the sky of that day. Time adds rising and houses — optional, whenever you're ready.";
}

export function livingDeleteConfirmAria(): string {
  return "Confirm remove Birth Sky data";
}

export function livingDeleteConfirmHeading(step: 1 | 2): string {
  return step === 1 ? livingDeleteConfirmTitle() : "This cannot be undone";
}

export function livingDeleteEntryCta(): string {
  return "Remove Birth Sky data";
}

export function livingExportSummaryLabel(): string {
  return "Birth Sky summary";
}

export function livingSettingsNavAria(): string {
  return "Birth Sky settings";
}

/** Soften greeting lines that still carry universe / Amy Astro product voice. */
export function livingSoftGreetingLine(raw: string, childName = "your child"): string {
  const t = raw.trim();
  if (!t) return t;
  const lower = t.toLowerCase();
  if (lower.includes("amy astro")) {
    return "Welcome back.";
  }
  if (lower.includes("universe is listening")) {
    return `${childName}'s sky is quiet and open again.`;
  }
  if (lower.includes("'s universe") || lower.includes("’s universe")) {
    return t.replace(/['']s universe/gi, "'s sky");
  }
  return t;
}
