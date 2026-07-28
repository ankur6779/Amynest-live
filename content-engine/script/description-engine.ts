import type { DescriptionParts } from "../types/content-package.js";

const DEFAULT_PLAY_STORE =
  "Download AmyNest AI on Google Play: https://play.google.com/store/apps/details?id=com.amynest.app";
const DEFAULT_WEBSITE = "Website: https://www.amynest.in";
const DEFAULT_SOCIAL = "Follow AmyNest: Instagram @amynest | YouTube @AmyNestAI";
const DEFAULT_DISCLAIMER =
  "Educational parenting content only. Not medical, clinical, or diagnostic advice. Consult a qualified professional for health concerns.";

/** Assemble a full YouTube description from structured parts. */
export function assembleDescription(parts: DescriptionParts, hashtags: string[]): string {
  const normalized = normalizeDescriptionParts(parts);
  const tagLine = hashtags
    .slice(0, 15)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .join(" ");

  return [
    normalized.seo,
    "",
    normalized.appPromotion,
    "",
    normalized.playStoreCta,
    normalized.website,
    normalized.socialLinks,
    "",
    normalized.disclaimer,
    "",
    tagLine,
  ].join("\n");
}

export function normalizeDescriptionParts(parts: DescriptionParts): DescriptionParts {
  return {
    seo: parts.seo.trim(),
    appPromotion: parts.appPromotion.trim(),
    playStoreCta: parts.playStoreCta.trim() || DEFAULT_PLAY_STORE,
    website: parts.website.trim() || DEFAULT_WEBSITE,
    socialLinks: parts.socialLinks.trim() || DEFAULT_SOCIAL,
    disclaimer: parts.disclaimer.trim() || DEFAULT_DISCLAIMER,
  };
}
