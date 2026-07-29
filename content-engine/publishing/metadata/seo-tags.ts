/**
 * Generate 15–20 SEO tags from the video topic / content package.
 */

import type { ContentPackage } from "../../types/content-package.js";

const EVERGREEN = [
  "AmyNest",
  "AmyNest AI",
  "parenting",
  "kids learning",
  "early learning",
  "parenting tips",
  "Study Zone",
  "YouTube Shorts",
  "Indian parents",
  "child development",
];

/** Build 15–20 unique SEO tags for a Short. */
export function generateSeoTags(content: ContentPackage): string[] {
  const seeds = [
    ...EVERGREEN,
    content.topic.category,
    content.topic.title,
    ...content.topic.keywords,
    ...content.keywords,
    ...content.hashtags.map(stripHash),
    ...featureHints(content),
  ];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of seeds) {
    for (const tag of expandTag(raw)) {
      const key = tag.toLowerCase();
      if (seen.has(key) || tag.length < 2 || tag.length > 40) continue;
      seen.add(key);
      out.push(tag);
      if (out.length >= 20) return out;
    }
  }

  // Pad to at least 15 with safe evergreen variants
  for (const pad of [
    "parenting app",
    "learning apps",
    "kids education",
    "Amy AI",
    "daily lessons",
  ]) {
    const key = pad.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pad);
    if (out.length >= 15) break;
  }

  return out.slice(0, 20);
}

function stripHash(tag: string): string {
  return tag.replace(/^#/, "").trim();
}

function expandTag(raw: string): string[] {
  const t = stripHash(raw).replace(/[_/]+/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return [];
  const out = [t];
  if (t.includes(" ") && t.length > 24) {
    out.push(...t.split(" ").filter((w) => w.length >= 4).slice(0, 2));
  }
  return out;
}

function featureHints(content: ContentPackage): string[] {
  const hay = `${content.title} ${content.story} ${content.description}`.toLowerCase();
  const hints: string[] = [];
  if (hay.includes("study")) hints.push("Study Zone", "daily lessons");
  if (hay.includes("speech")) hints.push("speech therapy", "speech and language");
  if (hay.includes("routine")) hints.push("kids routines", "daily routine");
  if (hay.includes("health")) hints.push("kids health", "parent health tips");
  if (hay.includes("game")) hints.push("learning games", "educational games");
  return hints;
}
