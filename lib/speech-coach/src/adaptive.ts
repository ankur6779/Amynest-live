// ─────────────────────────────────────────────────────────────────────────────
// Amy Speech Coach — adaptive session selection (deterministic)
// ─────────────────────────────────────────────────────────────────────────────

import type { PronouncePrompt } from "./types";

const WEAK_SCORE = 70;
const STRONG_SCORE = 90;

export interface PromptScoreHistory {
  promptId: string;
  bestScore: number;
  attempts: number;
}

/** Deterministic shuffle (LCG) — same seed → same order. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  let s = seed || 1;
  const next = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

type Bucket = "weak" | "medium" | "strong";

function classifyPrompt(
  promptId: string,
  bestById: Map<string, number>,
): Bucket {
  const best = bestById.get(promptId);
  if (best === undefined || best < WEAK_SCORE) return "weak";
  if (best >= STRONG_SCORE) return "strong";
  return "medium";
}

/**
 * Build a practice session that prioritises weak or unseen prompts.
 *
 * Mix (~60% weak/unseen, ~30% medium, ~10% strong). Falls back gracefully
 * when history is empty or the pool is small.
 */
export function buildAdaptivePromptSession(
  pool: readonly PronouncePrompt[],
  history: readonly PromptScoreHistory[],
  sessionSize: number,
  seed: number,
): PronouncePrompt[] {
  if (pool.length === 0) return [];
  const size = Math.max(1, Math.min(sessionSize, pool.length));

  const bestById = new Map<string, number>();
  for (const h of history) {
    const prev = bestById.get(h.promptId);
    if (prev === undefined || h.bestScore > prev) {
      bestById.set(h.promptId, h.bestScore);
    }
  }

  const buckets: Record<Bucket, PronouncePrompt[]> = {
    weak: [],
    medium: [],
    strong: [],
  };
  for (const p of pool) {
    buckets[classifyPrompt(p.id, bestById)].push(p);
  }

  const quotas: Record<Bucket, number> = {
    weak: Math.ceil(size * 0.6),
    medium: Math.ceil(size * 0.3),
    strong: Math.max(0, size - Math.ceil(size * 0.6) - Math.ceil(size * 0.3)),
  };

  const picked: PronouncePrompt[] = [];
  const used = new Set<string>();

  const pull = (bucket: Bucket, max: number) => {
    const list = seededShuffle(buckets[bucket], seed + bucket.length);
    let n = 0;
    for (const p of list) {
      if (n >= max || picked.length >= size) break;
      if (used.has(p.id)) continue;
      used.add(p.id);
      picked.push(p);
      n += 1;
    }
  };

  pull("weak", quotas.weak);
  pull("medium", quotas.medium);
  pull("strong", quotas.strong);

  if (picked.length < size) {
    const rest = seededShuffle(
      pool.filter((p) => !used.has(p.id)),
      seed + 101,
    );
    for (const p of rest) {
      if (picked.length >= size) break;
      picked.push(p);
    }
  }

  return seededShuffle(picked, seed + 303).slice(0, size);
}
