import type { SeoScoreBreakdown } from "../types/content-package.js";

export interface SeoScoreInput {
  title: string;
  description: string;
  keywords: string[];
  hashtags: string[];
  voiceScript: string;
}

/** Deterministic SEO score 0–100 with component breakdown. */
export function calculateSeoScore(input: SeoScoreInput): SeoScoreBreakdown {
  const keywordDensity = scoreKeywordDensity(input);
  const readability = scoreReadability(input.voiceScript);
  const titleQuality = scoreTitle(input.title);
  const descriptionQuality = scoreDescription(input.description);
  const hashtagDiversity = scoreHashtagDiversity(input.hashtags);

  const overall = clamp(
    Math.round(
      keywordDensity * 0.2 +
        readability * 0.2 +
        titleQuality * 0.25 +
        descriptionQuality * 0.2 +
        hashtagDiversity * 0.15,
    ),
  );

  return {
    overall,
    keywordDensity,
    readability,
    titleQuality,
    descriptionQuality,
    hashtagDiversity,
  };
}

function scoreKeywordDensity(input: SeoScoreInput): number {
  if (input.keywords.length === 0) return 40;
  const haystack = `${input.title} ${input.description} ${input.voiceScript}`.toLowerCase();
  let hits = 0;
  for (const keyword of input.keywords.slice(0, 8)) {
    if (haystack.includes(keyword.toLowerCase())) hits += 1;
  }
  const ratio = hits / Math.min(8, input.keywords.length);
  return clamp(Math.round(45 + ratio * 55));
}

function scoreReadability(script: string): number {
  const words = script.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const sentences = Math.max(1, script.split(/[.!?]+/).filter(Boolean).length);
  const avg = words.length / sentences;
  // Prefer short spoken sentences (8–14 words).
  if (avg >= 8 && avg <= 14) return 95;
  if (avg >= 6 && avg <= 18) return 80;
  if (avg >= 4 && avg <= 22) return 65;
  return 45;
}

function scoreTitle(title: string): number {
  const len = title.trim().length;
  let score = 50;
  if (len >= 30 && len <= 70) score += 30;
  else if (len >= 20 && len <= 85) score += 18;
  if (/amynest/i.test(title)) score += 8;
  if (!/[!]{2,}|\b(shocking|miracle|guaranteed)\b/i.test(title)) score += 12;
  return clamp(score);
}

function scoreDescription(description: string): number {
  const len = description.trim().length;
  let score = 40;
  if (len >= 200 && len <= 1200) score += 35;
  else if (len >= 120) score += 20;
  if (/play\.google\.com|amynest\.in/i.test(description)) score += 15;
  if (/disclaimer|not medical/i.test(description)) score += 10;
  return clamp(score);
}

function scoreHashtagDiversity(hashtags: string[]): number {
  if (hashtags.length < 10) return 40;
  const unique = new Set(hashtags.map((h) => h.toLowerCase()));
  const diversity = unique.size / hashtags.length;
  const countScore = hashtags.length >= 12 && hashtags.length <= 20 ? 30 : 15;
  return clamp(Math.round(diversity * 60 + countScore + 10));
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
