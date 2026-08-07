/**
 * Guidance Phase 2 — living stream helpers.
 * Presentation only. No tip / article / entitlement engine changes.
 *
 * Emotional target: one calm guidance stream — not a content catalogue.
 */

import { PARENTING_TIPS, type TipEntry } from "@/lib/parenting-tips-data";
import type { AgeGroup } from "@/lib/age-groups";

export type GuidanceStreamLaneId =
  | "daily-tips"
  | "new-parent-tips"
  | "amy-suggests"
  | "articles";

export type GuidanceRecommend = {
  id: "sentence";
  label: string;
  title: string;
  purpose: string;
};

export type GuidanceStreamLane = {
  id: GuidanceStreamLaneId;
  title: string;
  purpose: string;
};

/** Continuous reading lanes — ordered as one stream, not peer catalogue tiles. */
export const GUIDANCE_STREAM_LANES: readonly GuidanceStreamLane[] = [
  {
    id: "daily-tips",
    title: "For today",
    purpose: "Gentle tips for this season",
  },
  {
    id: "new-parent-tips",
    title: "New parent",
    purpose: "Soft footing when everything is new",
  },
  {
    id: "amy-suggests",
    title: "Amy suggests",
    purpose: "One quiet nudge from Amy",
  },
  {
    id: "articles",
    title: "Read a little more",
    purpose: "When you have a calm minute",
  },
] as const;

/** One recommended Understand act — first insight is sacred. */
export function recommendGuidanceAction(): GuidanceRecommend {
  return {
    id: "sentence",
    label: "Start here",
    title: "Today's sentence",
    purpose: "One clearer thought about your child",
  };
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Sacred first sentence for the Guidance opening.
 * Reuses tip corpus pick — does not rewrite tip engines.
 */
export function pickGuidanceSacredSentence(
  ageGroup: AgeGroup,
  salt = 0,
): TipEntry {
  const pool = PARENTING_TIPS[ageGroup]?.guidance ?? [];
  if (pool.length === 0) {
    return {
      id: "guidance-fallback",
      en: "One calm breath together is already guidance.",
    };
  }
  const seed = hashStr(`${todayKey()}_${ageGroup}_guidance_sacred_${salt}`);
  return pool[seed % pool.length]!;
}

/**
 * Amy Suggests lane sentence — presentation reuse of tip corpus.
 * Infant Care Amy Suggests engines remain untouched.
 */
export function pickAmySuggestsSentence(
  ageGroup: AgeGroup,
  salt = 1,
): TipEntry {
  const pool = PARENTING_TIPS[ageGroup]?.tip ?? [];
  if (pool.length === 0) {
    return {
      id: "amy-suggests-fallback",
      en: "Notice one small good thing they did today — and tell them.",
    };
  }
  const seed = hashStr(`${todayKey()}_${ageGroup}_amy_suggests_${salt}`);
  return pool[seed % pool.length]!;
}

/** Which stream lanes to show for this parent season. */
export function guidanceLanesForContext(opts: {
  isInfant: boolean;
  showNewParent: boolean;
}): GuidanceStreamLane[] {
  return GUIDANCE_STREAM_LANES.filter((lane) => {
    if (lane.id === "new-parent-tips") return opts.showNewParent;
    if (lane.id === "amy-suggests") return true;
    return true;
  });
}

/** Flag — Guidance living stream manufacturing. Default ON. */
export function isGuidanceLivingV1Enabled(): boolean {
  const raw = import.meta.env.VITE_FF_GUIDANCE_LIVING_V1;
  if (raw === undefined || raw === "") return true;
  return raw === "true" || raw === "1";
}

/** Synthetic quiet-module tile id for the unified Guidance stream. */
export const GUIDANCE_STREAM_TILE_ID = "__guidance_stream__" as const;
