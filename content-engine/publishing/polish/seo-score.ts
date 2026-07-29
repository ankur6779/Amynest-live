import type { ContentPackage } from "../../types/content-package.js";
import type { SeoBreakdown } from "./types.js";

/** Score publish metadata for SEO / CTR potential (0–100). */
export function scorePublishSeo(input: {
  content: ContentPackage;
  title: string;
  description: string;
  tags: string[];
  thumbnailTitle: string;
  hashtagCount: number;
}): SeoBreakdown {
  const title = scoreTitle(input.title);
  const description = scoreDescription(input.description);
  const keywords = scoreKeywords(input.content, input.title, input.description);
  const tags = scoreTags(input.tags);
  const ctrPotential = scoreCtr(
    input.title,
    input.thumbnailTitle,
    input.hashtagCount,
  );

  const score = clamp(
    Math.round(
      title * 0.28 +
        description * 0.24 +
        keywords * 0.16 +
        tags * 0.14 +
        ctrPotential * 0.18,
    ),
  );

  return {
    score,
    title,
    description,
    keywords,
    tags,
    ctrPotential,
    explanations: {
      title: explainTitle(input.title, title),
      description: explainDescription(input.description, description),
      keywords: explainKeywords(keywords),
      tags: explainTags(input.tags.length, tags),
      ctrPotential: explainCtr(input.thumbnailTitle, ctrPotential),
    },
  };
}

function scoreTitle(title: string): number {
  let s = 55;
  if (/amynest\s*ai/i.test(title)) s += 15;
  if (title.length >= 35 && title.length <= 70) s += 15;
  else if (title.length < 25) s -= 10;
  if (/\?|try|today|parents?:/i.test(title)) s += 8;
  if (title.length > 70) s -= 20;
  return clamp(s);
}

function scoreDescription(description: string): number {
  let s = 50;
  if (description.length >= 400) s += 20;
  else if (description.length >= 180) s += 12;
  if (/play\.google|apps\.apple|amynest\.in/i.test(description)) s += 12;
  if (/#AmyNest/i.test(description)) s += 8;
  if (/Study Zone|Speech|Routines|Games/i.test(description)) s += 8;
  return clamp(s);
}

function scoreKeywords(
  content: ContentPackage,
  title: string,
  description: string,
): number {
  const seeds = [
    ...content.topic.keywords,
    ...content.keywords,
    content.topic.category,
  ]
    .map((k) => k.toLowerCase())
    .filter(Boolean);
  if (seeds.length === 0) return 55;
  const hay = `${title} ${description}`.toLowerCase();
  const hits = seeds.filter((k) => hay.includes(k.toLowerCase())).length;
  return clamp(45 + Math.round((hits / Math.min(8, seeds.length)) * 50));
}

function scoreTags(tags: string[]): number {
  const n = tags.length;
  if (n >= 15 && n <= 20) return 90;
  if (n >= 10) return 75;
  if (n >= 5) return 60;
  return 40;
}

function scoreCtr(
  title: string,
  thumbnailTitle: string,
  hashtagCount: number,
): number {
  let s = 55;
  const words = thumbnailTitle.trim().split(/\s+/).filter(Boolean);
  if (words.length > 0 && words.length <= 4) s += 15;
  if (/panic|smarter|daily|calmer|clearer/i.test(thumbnailTitle)) s += 8;
  if (/\?|try this|today/i.test(title)) s += 10;
  if (hashtagCount >= 8 && hashtagCount <= 15) s += 7;
  return clamp(s);
}

function explainTitle(title: string, score: number): string {
  const bits = [
    /amynest\s*ai/i.test(title) ? "includes AmyNest AI brand" : "missing brand token",
    title.length <= 70 ? `${title.length}/70 chars` : "over 70 chars",
  ];
  return `Title score ${score}/100 — ${bits.join("; ")}.`;
}

function explainDescription(description: string, score: number): string {
  return `Description score ${score}/100 — ${description.length} chars with ${
    /amynest\.in/i.test(description) ? "store/web CTAs" : "weak CTAs"
  }.`;
}

function explainKeywords(score: number): string {
  return `Keywords score ${score}/100 — topic keywords reflected in title/description.`;
}

function explainTags(count: number, score: number): string {
  return `Tags score ${score}/100 — ${count} tags (target 15–20).`;
}

function explainCtr(thumbnailTitle: string, score: number): string {
  return `CTR potential ${score}/100 — thumbnail text "${thumbnailTitle}" (≤4 words ideal).`;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
