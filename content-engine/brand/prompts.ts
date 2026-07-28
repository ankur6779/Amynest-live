import { buildCinematicPromptBlock } from "./cinematic.js";
import { buildCharacterPromptBlock, selectBrandCharacters } from "./characters.js";
import { getBrandIdentityKit, pickBrandCtaLine } from "./identity.js";
import { BRAND_LOCK_VERSION } from "./lock.js";
import type { DiscoveredFeature } from "./types.js";

export function buildBrandSystemPromptBlock(input: {
  category?: string;
  title?: string;
  keywords?: string[];
  feature?: DiscoveredFeature;
}): string {
  const kit = getBrandIdentityKit();
  const casting = selectBrandCharacters(input);
  const cta = pickBrandCtaLine(input.title ?? input.feature?.id ?? "amynest");
  const featureLine = input.feature
    ? `Feature focus (from live codebase): ${input.feature.title} (${input.feature.sourcePath}) — ${input.feature.summary}`
    : "Feature focus: map the topic to a real AmyNest capability (Learning, Astro, Health, Speech, Games, Coach, Audio, Routines, Premium).";

  return [
    `AMYNEST BRAND LOCK ${BRAND_LOCK_VERSION} — IMMUTABLE`,
    `Brand: ${kit.brandName}. Website: ${kit.websiteUrl}.`,
    `Colors: primary ${kit.colors.primary}, deep ${kit.colors.deepPurple}, accent ${kit.colors.accent}, gold ${kit.colors.secondary}.`,
    buildCinematicPromptBlock(),
    featureLine,
    "Educate parents — never create generic promotional filler.",
    "Script arc (never skip): Hook → Problem → AmyNest Solution → Benefit → Download CTA.",
    "Tone: helpful parenting guide — not generic marketing.",
    `Storytelling priorities: ${kit.storytellingPriorities.join(", ")}.`,
    "Characters (official only — never redesign / never invent mascots):",
    buildCharacterPromptBlock([casting.primary, ...casting.supporting]),
    "Maintain face, hair, eyes, expressions, clothing, proportions, material, lighting, palette — zero identity drift.",
    "Video beats: 1) Hook 2) Problem (Amy AI) 3) Feature solution demo 4) Emotional benefit 5) Official CTA end card.",
    `CTA must be one of: ${kit.endCard.ctaLines.join(" | ")}. Prefer: ${cta}.`,
    "End card (2–3s): official app icon + Download AmyNest AI + Google Play + App Store + website + purple glow.",
    ...kit.neverRules.map((r) => `- ${r}`),
  ].join("\n");
}

export function buildBrandVisualPromptBlock(input: {
  category?: string;
  title?: string;
  keywords?: string[];
  feature?: DiscoveredFeature;
}): string {
  const kit = getBrandIdentityKit();
  const casting = selectBrandCharacters(input);
  return [
    `Official AmyNest studio look (${BRAND_LOCK_VERSION}).`,
    buildCinematicPromptBlock(),
    `Purple brand palette (${kit.colors.primary} / ${kit.colors.deepPurple}).`,
    buildCharacterPromptBlock([casting.primary, "amy-ai"]),
    "Use official AmyNest app icon only when a logo is required — never recreate the icon with AI.",
    "Premium parenting Shorts composition, vertical 9:16, soft cinematic lighting, natural motion.",
    "Reject generic AI look — every frame must feel like the same AmyNest animation studio.",
  ].join("\n");
}
