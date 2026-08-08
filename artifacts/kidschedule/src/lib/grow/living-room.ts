/**
 * Grow Phase 2 — living educational room helpers.
 * Presentation only. No learning engine / entitlement / route rewrites.
 *
 * Emotional target: one calm educational room — not a SaaS catalogue.
 */

import { resolvePortfolioLivingFlag } from "@/lib/amynest-living-universe";

export type GrowPathId =
  | "numbers"
  | "beads"
  | "sounds"
  | "spelling"
  | "study"
  | "challenge";

export type GrowRecommend = {
  id: "practice";
  pathId: GrowPathId;
  tileId: string;
  label: string;
  title: string;
  purpose: string;
};

export type GrowQuietPath = {
  id: GrowPathId;
  tileId: string;
  title: string;
  purpose: string;
  /** Competitive / later energy — never lead Grow */
  demoted?: boolean;
};

/**
 * Continuous quiet learning paths — calm names, not PRO / Zone / Mastery SKUs.
 * Olympiad last. Never unlock theatre as first language.
 */
export const GROW_QUIET_PATHS: readonly GrowQuietPath[] = [
  {
    id: "numbers",
    tileId: "smart-math-tricks",
    title: "Numbers gently",
    purpose: "Quiet number play together",
  },
  {
    id: "beads",
    tileId: "abacus",
    title: "Beads & counting",
    purpose: "One calm counting moment",
  },
  {
    id: "sounds",
    tileId: "phonics",
    title: "Sounds & letters",
    purpose: "Hear language grow softly",
  },
  {
    id: "spelling",
    tileId: "spelling-mastery",
    title: "Spelling calmly",
    purpose: "Words without pressure",
  },
  {
    id: "study",
    tileId: "smart-study",
    title: "Quiet study",
    purpose: "Focus without the rush",
  },
  {
    id: "challenge",
    tileId: "olympiad",
    title: "Challenge later",
    purpose: "When they are ready — never forced",
    demoted: true,
  },
] as const;

const GROW_TILE_IDS = new Set(GROW_QUIET_PATHS.map((p) => p.tileId));

export function isGrowTileId(tileId: string): boolean {
  return GROW_TILE_IDS.has(tileId);
}

/** Map legacy Hub tile → Grow living path (deep links). */
export function growPathForTile(tileId: string): GrowPathId | null {
  const path = GROW_QUIET_PATHS.find((p) => p.tileId === tileId);
  return path?.id ?? null;
}

/** Primary tile for a Grow path. */
export function tileIdForGrowPath(pathId: GrowPathId): string {
  return GROW_QUIET_PATHS.find((p) => p.id === pathId)?.tileId ?? "phonics";
}

/** Quiet deepen cue for a legacy Hub tile — never SKU / unlock language. */
export function growDeepenCueForTile(tileId: string): {
  title: string;
  purpose: string;
} | null {
  const path = GROW_QUIET_PATHS.find((p) => p.tileId === tileId);
  if (!path) return null;
  return { title: path.title, purpose: path.purpose };
}

/**
 * One recommended Understand practice act.
 * Younger children → sounds; older → numbers. Never olympiad first.
 */
export function recommendGrowAction(
  childName = "your child",
  ageMonths = 60,
): GrowRecommend {
  if (ageMonths < 54) {
    return {
      id: "practice",
      pathId: "sounds",
      tileId: "phonics",
      label: "Start here",
      title: `Today's practice with ${childName}`,
      purpose: "One calm learning moment — no pressure",
    };
  }
  return {
    id: "practice",
    pathId: "numbers",
    tileId: "smart-math-tricks",
    label: "Start here",
    title: `Today's practice with ${childName}`,
    purpose: "One calm learning moment — no pressure",
  };
}

/** Paths visible for this age season — olympiad only when older. */
export function growPathsForAge(ageMonths: number): GrowQuietPath[] {
  return GROW_QUIET_PATHS.filter((path) => {
    if (path.id === "challenge") return ageMonths >= 72;
    if (path.id === "study") return ageMonths >= 48;
    if (path.id === "spelling") return ageMonths >= 36;
    if (path.id === "beads" || path.id === "numbers") return ageMonths >= 24;
    return true; // sounds always when Grow is shown
  });
}

/** Flag — Grow living room manufacturing. Default ON. */
export function isGrowLivingV1Enabled(): boolean {
  return resolvePortfolioLivingFlag(import.meta.env.VITE_FF_GROW_LIVING_V1);
}

/** Synthetic quiet-module tile id for the unified Grow room surface. */
export const GROW_STREAM_TILE_ID = "__grow_stream__" as const;

/** Hub module featureIds that belong to Grow leave destinations. */
const GROW_LEAVE_FEATURE_IDS = new Set([
  "hub_abacus",
  "hub_phonics",
  "hub_spelling_mastery",
  "hub_olympiad",
  "hub_smart_math_tricks",
  "hub_smart_study",
]);

export function isGrowLeaveFeatureId(featureId: string): boolean {
  return GROW_LEAVE_FEATURE_IDS.has(featureId);
}

/** Calm deep-leave materials — same house as Understand / Speech deep / Health deep. */
export const GROW_LIVING_DEEP_PALETTE = {
  sand: "rgba(232,212,184,0.95)",
  sandBorder: "rgba(232,212,184,0.28)",
  night: "#120e18",
  textBright: "rgba(255,252,248,0.96)",
} as const;

export function livingGrowLeaveEyebrow(): string {
  return "Today's growth";
}

/** Calm page title for a Grow leave — never PRO / Zone / Academy / Mastery. */
export function livingGrowPageTitle(pathId: GrowPathId | "phonics-hub"): string {
  switch (pathId) {
    case "beads":
      return "Beads & counting";
    case "sounds":
    case "phonics-hub":
      return "Sounds & letters";
    case "numbers":
      return "Numbers gently";
    case "spelling":
      return "Spelling calmly";
    case "study":
      return "Quiet study";
    case "challenge":
      return "Challenge later";
    default:
      return "Today's practice";
  }
}

export function livingGrowPageTitleForFeature(featureId: string): string | null {
  if (featureId === "hub_abacus") return livingGrowPageTitle("beads");
  if (featureId === "hub_phonics") return livingGrowPageTitle("sounds");
  if (featureId === "hub_smart_math_tricks") return livingGrowPageTitle("numbers");
  if (featureId === "hub_spelling_mastery") return livingGrowPageTitle("spelling");
  if (featureId === "hub_olympiad") return livingGrowPageTitle("challenge");
  if (featureId === "hub_smart_study") return livingGrowPageTitle("study");
  return null;
}

export function livingGrowPrimaryCta(): string {
  return "Begin gently";
}

export function livingGrowContinueCta(): string {
  return "Continue calmly";
}

export function livingGrowCompleteTitle(): string {
  return "We practiced something useful";
}

export function livingGrowStreakLabel(days: number): string {
  if (days <= 0) return "";
  return `Showing up · ${days} days`;
}

export function livingGrowPointsLabel(): string {
  return "Practice notes";
}

export function livingGrowAcademyEyebrow(): string {
  return "Sounds & letters";
}

export function livingGrowMissionEyebrow(): string {
  return "Today's practice";
}

export function livingGrowAdventureEyebrow(): string {
  return "Today's reading practice";
}

export function livingGrowEmptyAbacus(): string {
  return "Beads & counting is available from age 2+. Add or select an eligible child.";
}

export function livingGrowEmptyPhonics(): string {
  return "Sounds & letters supports ages 1–6. Select or add a child in that range.";
}

export function livingGrowPremiumGateTitle(): string {
  return "Continue learning with AmyNest";
}

export function livingGrowPremiumGateBody(): string {
  return "Your free Parent Hub exploration has ended. Amy can keep supporting calm daily practice whenever you're ready.";
}
