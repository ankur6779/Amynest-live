import type { TitleSet } from "../types/content-package.js";

const CLICKBAIT_PATTERNS = [
  /\bshocking\b/i,
  /\byou won't believe\b/i,
  /\bdoctors hate\b/i,
  /\bmiracle\b/i,
  /\bguaranteed\b/i,
  /\bsecret hack\b/i,
  /\bexposed\b/i,
  /!!!+/,
];

/** Normalize and harden titles against clickbait while preserving CTR variants. */
export function refineTitleSet(titles: TitleSet, topicTitle: string): TitleSet {
  const primary = sanitizeTitle(titles.primary || topicTitle);
  const alternates = uniqueTitles(
    titles.alternates.map(sanitizeTitle).filter(Boolean),
    5,
    primary,
  );
  while (alternates.length < 5) {
    alternates.push(sanitizeTitle(`${topicTitle} Tip ${alternates.length + 1}`));
  }

  return {
    primary,
    alternates: alternates.slice(0, 5),
    short: sanitizeTitle(titles.short || truncate(primary, 42)),
    highCtr: sanitizeTitle(softenCtr(titles.highCtr || `${topicTitle}? A Gentle Approach`)),
    searchOptimized: sanitizeTitle(
      titles.searchOptimized || `${topicTitle} Tips for Parents | AmyNest`,
    ),
  };
}

export function isClickbaitTitle(title: string): boolean {
  return CLICKBAIT_PATTERNS.some((re) => re.test(title));
}

function softenCtr(title: string): string {
  if (!isClickbaitTitle(title)) return title;
  return title
    .replace(/\bshocking\b/gi, "helpful")
    .replace(/\byou won't believe\b/gi, "parents often miss")
    .replace(/\bmiracle\b/gi, "simple")
    .replace(/\bguaranteed\b/gi, "practical")
    .replace(/\bsecret hack\b/gi, "practical tip")
    .replace(/\bexposed\b/gi, "explained")
    .replace(/!{2,}/g, "!");
}

function sanitizeTitle(title: string): string {
  return softenCtr(title).replace(/\s+/g, " ").trim();
}

function uniqueTitles(titles: string[], count: number, primary: string): string[] {
  const seen = new Set<string>([primary.toLowerCase()]);
  const out: string[] = [];
  for (const title of titles) {
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(title);
    if (out.length >= count) break;
  }
  return out;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}
