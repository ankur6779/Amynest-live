/**
 * Grow Phase 2 — living educational room helpers.
 * Presentation only. No learning engine / entitlement / route rewrites.
 *
 * Emotional target: one calm educational room — not a SaaS catalogue.
 */

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
  const raw = import.meta.env.VITE_FF_GROW_LIVING_V1;
  if (raw === undefined || raw === "") return true;
  return raw === "true" || raw === "1";
}

/** Synthetic quiet-module tile id for the unified Grow room surface. */
export const GROW_STREAM_TILE_ID = "__grow_stream__" as const;
