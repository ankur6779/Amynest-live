/**
 * Moments Phase 2 — living room helpers.
 * Presentation only. No activity / story / make / Talking Amy engine changes.
 *
 * Emotional target: one emotional room — never four products.
 */

export type MomentsPathId = "presence" | "story" | "make" | "talking-amy";

export type MomentsRecommend = {
  id: "together";
  pathId: MomentsPathId;
  /** Legacy tile opened in quiet slot */
  tileId: string;
  label: string;
  title: string;
  purpose: string;
};

export type MomentsQuietPath = {
  id: MomentsPathId;
  tileId: string;
  title: string;
  purpose: string;
};

/**
 * Continuous quiet paths inside one Moments room.
 * Talking Amy is last — never leads Moments.
 */
export const MOMENTS_QUIET_PATHS: readonly MomentsQuietPath[] = [
  {
    id: "presence",
    tileId: "activities",
    title: "Together now",
    purpose: "Ten minutes side by side",
  },
  {
    id: "story",
    tileId: "story-hub",
    title: "One story",
    purpose: "Share a quiet story",
  },
  {
    id: "make",
    tileId: "worksheets",
    title: "Make together",
    purpose: "Create something side by side",
  },
  {
    id: "talking-amy",
    tileId: "talking-amy",
    title: "Soft voice",
    purpose: "Playful talk when you're ready",
  },
] as const;

/** Soft deepen under Presence — not a six-tile product nest. */
export const MOMENTS_PRESENCE_SOFT: readonly {
  tileId: string;
  title: string;
  purpose: string;
}[] = [
  {
    tileId: "origami-studio",
    title: "Fold together",
    purpose: "One calm craft",
  },
  {
    tileId: "art-craft",
    title: "Create gently",
    purpose: "Watch and make",
  },
] as const;

/** Soft deepen under Make — continuous, not a print mall. */
export const MOMENTS_MAKE_SOFT: readonly {
  tileId: string;
  title: string;
  purpose: string;
}[] = [
  {
    tileId: "coloring-books",
    title: "Colour together",
    purpose: "Quiet colouring side by side",
  },
  {
    tileId: "fun-sheets",
    title: "A light sheet",
    purpose: "One gentle page",
  },
] as const;

/** One recommended Moments act for a tired parent. */
export function recommendMomentsAction(childName = "your child"): MomentsRecommend {
  return {
    id: "together",
    pathId: "presence",
    tileId: "activities",
    label: "Try this together",
    title: `Ten minutes with ${childName}`,
    purpose: "One beautiful moment — start here",
  };
}

/** Map legacy Hub tile → Moments living path (deep links). */
export function momentsPathForTile(tileId: string): MomentsPathId | null {
  switch (tileId) {
    case "activities":
    case "origami-studio":
    case "art-craft":
    case "discovery-worlds":
    case "event-prep":
      return "presence";
    case "story-hub":
      return "story";
    case "worksheets":
    case "coloring-books":
    case "fun-sheets":
      return "make";
    case "talking-amy":
      return "talking-amy";
    default:
      return null;
  }
}

/** Primary tile for a Moments path. */
export function tileIdForMomentsPath(pathId: MomentsPathId): string {
  const path = MOMENTS_QUIET_PATHS.find((p) => p.id === pathId);
  return path?.tileId ?? "activities";
}

/** Flag — Moments living room manufacturing. Default ON. */
export function isMomentsLivingV1Enabled(): boolean {
  const raw = import.meta.env.VITE_FF_MOMENTS_LIVING_V1;
  if (raw === undefined || raw === "") return true;
  return raw === "true" || raw === "1";
}

/** Synthetic quiet-module tile id for the unified Moments room surface. */
export const MOMENTS_STREAM_TILE_ID = "__moments_stream__" as const;
