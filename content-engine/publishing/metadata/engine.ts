import type { ContentPackage } from "../../types/content-package.js";
import type {
  PublishMetadata,
  PublishMetadataOverrides,
  PublishingEngineSettings,
  ThumbnailResolution,
  VideoVisibility,
} from "../../types/published-video.js";

/** Build publish metadata from ContentPackage with optional overrides. */
export function buildPublishMetadata(
  content: ContentPackage,
  settings: Pick<
    PublishingEngineSettings,
    "defaultVisibility" | "playlist" | "categoryId" | "license" | "madeForKids"
  >,
  overrides: PublishMetadataOverrides = {},
): PublishMetadata {
  const visibility: VideoVisibility =
    overrides.visibility ?? settings.defaultVisibility;
  const tags = uniqueTags([
    ...(overrides.tags ?? content.hashtags.map(stripHash)),
    ...content.keywords,
  ]).slice(0, 30);

  return {
    title: clampTitle(overrides.title ?? content.title),
    description: overrides.description ?? buildDescription(content),
    tags,
    categoryId: overrides.categoryId ?? settings.categoryId,
    language: overrides.language ?? content.language,
    playlistId: overrides.playlistId ?? settings.playlist,
    visibility,
    license: overrides.license ?? settings.license,
    madeForKids: overrides.madeForKids ?? settings.madeForKids,
    selfDeclaredMadeForKids: overrides.madeForKids ?? settings.madeForKids,
  };
}

/**
 * Resolve thumbnail path without generating images.
 * Priority: generated → fallback → branding default descriptor.
 */
export function resolveThumbnail(input: {
  generatedPath?: string;
  fallbackPath?: string;
  brandingDefaultPath?: string;
}): ThumbnailResolution {
  if (input.generatedPath?.trim()) {
    return {
      path: input.generatedPath,
      source: "generated",
      applied: false,
    };
  }
  if (input.fallbackPath?.trim()) {
    return {
      path: input.fallbackPath,
      source: "fallback",
      applied: false,
    };
  }
  return {
    path: input.brandingDefaultPath?.trim() || "brand://amynest-default-thumb.jpg",
    source: "branding-default",
    applied: false,
  };
}

function buildDescription(content: ContentPackage): string {
  const hashtags = content.hashtags
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .join(" ");
  return [
    content.description.trim(),
    "",
    content.cta.trim(),
    "",
    hashtags,
  ]
    .join("\n")
    .trim();
}

function clampTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= 100) return trimmed;
  return `${trimmed.slice(0, 97).trimEnd()}...`;
}

function stripHash(tag: string): string {
  return tag.replace(/^#/, "").trim();
}

function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const normalized = stripHash(tag);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}
