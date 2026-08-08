/**
 * Birth Sky Phase 2 — living room hierarchy helpers.
 * Presentation only. No engine / calculation / intelligence / API / DB changes.
 *
 * Emotional target: UNDERSTAND — another room in the AmyNest home.
 * Never astrology app, prediction, horoscope, cosmic dashboard, SaaS, marketplace.
 */

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

/** Flag — Birth Sky living room manufacturing. Default ON. */
export function isBirthSkyLivingV1Enabled(): boolean {
  const raw = import.meta.env.VITE_FF_BIRTH_SKY_LIVING_V1;
  if (raw === undefined || raw === "") return true;
  return raw === "true" || raw === "1";
}
