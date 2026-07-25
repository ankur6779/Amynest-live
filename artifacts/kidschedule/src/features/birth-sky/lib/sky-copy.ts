/**
 * Natural-English helpers for Amy Astro copy — avoid "a Aries" / "Full Moon Moon".
 */

const VOWEL_SOUND = /^[aeiou]/i;

/** "Aries" → "an Aries"; "Leo" → "a Leo" */
export function withIndefiniteArticle(noun: string): string {
  const t = noun.trim();
  if (!t) return "a";
  return `${VOWEL_SOUND.test(t) ? "an" : "a"} ${t}`;
}

/**
 * Moon phase for prose. If label already ends with "Moon", do not append again.
 * "Full Moon" → "Full Moon"; "Waxing Gibbous" → "Waxing Gibbous Moon"
 */
export function moonPhasePhrase(label: string): string {
  const t = label.trim();
  if (!t) return "the Moon";
  if (/\bmoon\b$/i.test(t)) return t;
  return `${t} Moon`;
}

/** Lowercase phase phrase for mid-sentence use */
export function moonPhasePhraseLower(label: string): string {
  const p = moonPhasePhrase(label);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

/** Estimate reading minutes from word count (~200 wpm, min 1). */
export function estimateReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Stable hash for deterministic “random” picks */
export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickFromPool<T>(pool: readonly T[], seed: string): T {
  const i = hashSeed(seed) % pool.length;
  return pool[i]!;
}
