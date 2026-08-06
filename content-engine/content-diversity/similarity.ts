import type { DiversityFingerprint, SimilarityBreakdown } from "./types.js";

export function compareFingerprints(
  a: DiversityFingerprint,
  b: DiversityFingerprint,
): SimilarityBreakdown {
  const scenes = jaccard(a.locations, b.locations);
  const backgrounds = scenes;
  const cameras = jaccard(a.cameras, b.cameras);
  const characterPoses = jaccard(a.amyPoses, b.amyPoses);
  const thumbnail = a.thumbnailHero === b.thumbnailHero ? 1 : 0;
  const title = tokenOverlap(a.title, b.title);
  const description = tokenOverlap(a.descriptionSeed, b.descriptionSeed);
  const tags = jaccard(a.featureProps, b.featureProps);
  const hashtags = jaccard(
    a.hashtags.map((h) => h.toLowerCase()),
    b.hashtags.map((h) => h.toLowerCase()),
  );
  const cta = a.ctaWording.trim().toLowerCase() === b.ctaWording.trim().toLowerCase()
    ? 1
    : tokenOverlap(a.ctaWording, b.ctaWording);

  // Brand-locked CTA + core hashtags (#AmyNest/#Shorts) always overlap — do not
  // count them toward "same Short" similarity or every video fails Diversity >90.
  const overall =
    scenes * 0.2 +
    backgrounds * 0.12 +
    cameras * 0.16 +
    characterPoses * 0.16 +
    thumbnail * 0.12 +
    title * 0.12 +
    description * 0.08 +
    tags * 0.04 +
    hashtags * 0 +
    cta * 0;

  return {
    scenes,
    backgrounds,
    cameras,
    characterPoses,
    thumbnail,
    title,
    description,
    tags,
    hashtags,
    cta,
    overall,
  };
}

export function maxSimilarityToRecent(
  candidate: DiversityFingerprint,
  recent: DiversityFingerprint[],
): { similarity: number; peerId?: string; breakdown: SimilarityBreakdown } {
  let best = 0;
  let peerId: string | undefined;
  let breakdown: SimilarityBreakdown = emptyBreakdown();
  for (const peer of recent) {
    const b = compareFingerprints(candidate, peer);
    if (b.overall > best) {
      best = b.overall;
      peerId = peer.id;
      breakdown = b;
    }
  }
  return { similarity: best, peerId, breakdown };
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a.map((x) => x.toLowerCase()));
  const B = new Set(b.map((x) => x.toLowerCase()));
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

function tokenOverlap(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  return jaccard([...ta], [...tb]);
}

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

function emptyBreakdown(): SimilarityBreakdown {
  return {
    scenes: 0,
    backgrounds: 0,
    cameras: 0,
    characterPoses: 0,
    thumbnail: 0,
    title: 0,
    description: 0,
    tags: 0,
    hashtags: 0,
    cta: 0,
    overall: 0,
  };
}
