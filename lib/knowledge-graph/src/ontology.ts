import type { ConceptEdgeKind, ConceptNodeKind } from "./types.js";

export const REVIEW_HISTORY_CAP = 24;

/** Idle days before a practiced node can flip to forgotten. */
export const FORGOTTEN_IDLE_DAYS = 14;

/** Confidence thresholds. */
export const CONFIDENCE = {
  mastered: 85,
  recognized: 55,
  struggling: 40,
  forgottenFloor: 25,
} as const;

/** Modality → confidence delta (clamped later). */
export const MODALITY_DELTA: Record<
  "seen" | "heard" | "recognized" | "spoken" | "failed",
  number
> = {
  seen: 4,
  heard: 8,
  recognized: 14,
  spoken: 16,
  failed: -12,
};

export const MASTERY_MIN_SUCCESSFUL_REVIEWS = 3;

export function edgeId(from: string, kind: ConceptEdgeKind, to: string): string {
  return `${from}|${kind}|${to}`;
}

export function nodeId(kind: ConceptNodeKind, slug: string): string {
  return `${kind}:${slug}`;
}

export function phonemeId(letter: string): string {
  return nodeId("phoneme", letter.toLowerCase());
}

export function entityId(slug: string): string {
  return nodeId("entity", slug);
}

export function habitatId(slug: string): string {
  return nodeId("habitat", slug);
}

export function categoryId(slug: string): string {
  return nodeId("category", slug);
}

export function soundConceptId(slug: string): string {
  return nodeId("sound", slug);
}

export function wordId(slug: string): string {
  return nodeId("word", slug);
}

export function clampConfidence(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function daysBetween(isoA: string, isoB: string): number {
  const a = Date.parse(isoA);
  const b = Date.parse(isoB);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.abs(b - a) / (1000 * 60 * 60 * 24);
}
