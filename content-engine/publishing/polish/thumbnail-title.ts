import type { ContentPackage } from "../../types/content-package.js";

const STOP = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "for",
  "with",
  "that",
  "this",
  "from",
  "your",
  "you",
  "to",
  "of",
  "in",
  "on",
  "how",
  "why",
]);

/** Short overlay text for thumbnails — maximum 4 words. */
export function buildThumbnailTitle(content: ContentPackage): string {
  const hay = `${content.topic.title} ${content.hook} ${content.title}`.toLowerCase();

  if (/worksheet|homework panic|panic/.test(hay)) return "Worksheet Panic";
  if (/study zone|daily lesson|lesson/.test(hay)) return "Daily Learning";
  if (/speech|language|pronounc/.test(hay)) return "Clearer Speech";
  if (/routine|morning|bedtime|habit/.test(hay)) return "Calmer Routines";
  if (/health|sleep|nutrition/.test(hay)) return "Healthy Habits";
  if (/game|play|puzzle/.test(hay)) return "Learning Games";
  if (/screen time/.test(hay)) return "Smarter Screens";
  if (/discipline|tantrum/.test(hay)) return "Calmer Discipline";

  const words = content.topic.title
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w.toLowerCase()));

  if (words.length === 0) return "Study Smarter";
  return words
    .slice(0, 4)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
