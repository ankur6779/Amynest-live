/**
 * Thumbnail headlines — max 4 words, emotion-first, no clickbait.
 */

import { buildThumbnailTitle } from "../publishing/polish/thumbnail-title.js";
import type { ContentPackage } from "../types/content-package.js";

const ALLOWED = new Set([
  "Daily Learning",
  "Speak Better",
  "Smart Routine",
  "Routine Magic",
  "Happy Reading",
  "Reading Time",
  "Healthy Kids",
  "Healthy Habits",
  "Star Secrets",
  "Worksheet Panic",
  "Clearer Speech",
  "Calmer Routines",
  "Learning Games",
  "Smarter Screens",
  "Calmer Discipline",
  "Study Smarter",
]);

/** Pick partner child from topic keywords. */
export function pickThumbnailPartner(
  content: ContentPackage,
): "amy-girl" | "amy-boy" {
  const hay = `${content.topic.title} ${content.topic.category} ${content.topic.keywords.join(" ")}`.toLowerCase();
  if (/boy|math|astro|logic|science|puzzle|adventure/.test(hay)) return "amy-boy";
  return "amy-girl";
}

/** 3–4 word emotional headline for the thumbnail. */
export function resolveThumbnailHeadline(content: ContentPackage): string {
  const hay = `${content.topic.title} ${content.hook} ${content.title}`.toLowerCase();
  if (/speech|speak|pronounc|language/.test(hay)) return "Speak Better";
  if (/read|story|book|phonics/.test(hay)) return "Reading Time";
  if (/health|sleep|nutrition|wellness/.test(hay)) return "Healthy Habits";
  if (/astro|star|space|planet/.test(hay)) return "Star Secrets";
  if (/routine|habit|morning|bedtime/.test(hay)) return "Routine Magic";
  if (/lesson|learn|study|homework|worksheet/.test(hay)) return "Daily Learning";

  const fromPolish = buildThumbnailTitle(content);
  const words = fromPolish.trim().split(/\s+/).filter(Boolean);
  if (words.length > 4) return words.slice(0, 4).join(" ");
  if (words.length >= 2) return fromPolish;
  return "Daily Learning";
}

export function assertHeadlineSafe(headline: string): string {
  const words = headline.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Daily Learning";
  if (words.length > 4) return words.slice(0, 4).join(" ");
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function isKnownHeadline(headline: string): boolean {
  return ALLOWED.has(headline) || headline.trim().split(/\s+/).length <= 4;
}
