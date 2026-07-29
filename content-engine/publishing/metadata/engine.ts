import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ContentPackage } from "../../types/content-package.js";
import type {
  PublishMetadata,
  PublishMetadataOverrides,
  PublishingEngineSettings,
  ThumbnailResolution,
  VideoVisibility,
} from "../../types/published-video.js";
import { buildPublishingPolish } from "../polish/build.js";
import { buildScorecard } from "../polish/scorecard.js";
import { scorePublishSeo } from "../polish/seo-score.js";
import { buildOptimizedDescription } from "./description-template.js";
import {
  looksLikeYouTubePlaylistId,
  resolvePlaylistId,
  resolvePlaylistName,
  type AmyNestPlaylistName,
} from "./playlists.js";

const PLAYLIST_NAMES = new Set<AmyNestPlaylistName>([
  "Study Zone",
  "Speech",
  "Health",
  "Games",
  "Parent Tips",
  "Routine",
]);

function asPlaylistName(value: string | undefined): AmyNestPlaylistName | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return PLAYLIST_NAMES.has(trimmed as AmyNestPlaylistName)
    ? (trimmed as AmyNestPlaylistName)
    : undefined;
}
import { generateSeoTags } from "./seo-tags.js";
import { resolveStoreLinks } from "./store-links.js";
import { clampTitle } from "./title-utils.js";

export { clampTitle } from "./title-utils.js";

/** Build publish metadata from ContentPackage with optimized YouTube defaults. */
export function buildPublishMetadata(
  content: ContentPackage,
  settings: Pick<
    PublishingEngineSettings,
    | "defaultVisibility"
    | "playlist"
    | "categoryId"
    | "license"
    | "madeForKids"
    | "aiDisclosure"
  >,
  overrides: PublishMetadataOverrides = {},
): PublishMetadata {
  const visibility: VideoVisibility =
    overrides.visibility ?? settings.defaultVisibility;

  const madeForKids = resolveMadeForKids(settings, overrides);
  const containsSyntheticMedia = resolveAiDisclosure(settings, overrides);

  const playlistName =
    asPlaylistName(overrides.playlistName) ?? resolvePlaylistName(content);
  const resolvedPlaylistId =
    overrides.playlistId?.trim() ||
    resolvePlaylistId(playlistName, settings.playlist);
  const playlistId = looksLikeYouTubePlaylistId(resolvedPlaylistId)
    ? resolvedPlaylistId
    : looksLikeYouTubePlaylistId(settings.playlist)
      ? settings.playlist
      : resolvedPlaylistId;

  const tags = uniqueTags([
    ...(overrides.tags ?? []),
    ...generateSeoTags(content),
  ]).slice(0, 20);

  while (tags.length < 15) {
    const pad = `AmyNest tip ${tags.length + 1}`;
    if (!tags.some((t) => t.toLowerCase() === pad.toLowerCase())) tags.push(pad);
    else break;
  }

  const polish = buildPublishingPolish({
    content,
    title: overrides.title,
    description: overrides.description,
    tags,
  });
  // Publish title stays on the content package; variants are for Continuous Learning.
  const title = clampTitle(overrides.title ?? content.title);
  const description =
    overrides.description ??
    polish.descriptionVariants.long ??
    buildOptimizedDescription(resolveStoreLinks());
  const descriptionWithTags = description.includes("#AmyNest")
    ? description
    : `${description.trim()}\n\n${polish.hashtags.all.join(" ")}`.trim();

  // Keep EN localization + SEO aligned with the final selected publish copy.
  polish.localizations.en = { title, description: descriptionWithTags };
  polish.seo = scorePublishSeo({
    content,
    title,
    description: descriptionWithTags,
    tags,
    thumbnailTitle: polish.thumbnailTitle,
    hashtagCount: polish.hashtags.all.length,
  });
  polish.scorecard = buildScorecard(polish);

  return {
    title,
    description: descriptionWithTags,
    tags: tags.slice(0, 20),
    categoryId: overrides.categoryId ?? settings.categoryId,
    language: overrides.language ?? content.language,
    playlistId,
    playlistName,
    visibility,
    license: overrides.license ?? settings.license,
    madeForKids,
    selfDeclaredMadeForKids: madeForKids,
    containsSyntheticMedia,
    polish,
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
  /** Optional render/output directory to auto-discover a generated thumb. */
  searchDirectory?: string;
}): ThumbnailResolution {
  const discovered = input.searchDirectory
    ? discoverThumbnail(input.searchDirectory)
    : undefined;
  const generated = input.generatedPath?.trim() || discovered;
  if (generated) {
    return {
      path: generated,
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

function discoverThumbnail(dir: string): string | undefined {
  const candidates = [
    "thumbnail.jpg",
    "thumbnail.jpeg",
    "thumbnail.png",
    "thumb.jpg",
    "youtube-thumbnail.jpg",
    "shorts-thumbnail.jpg",
  ];
  for (const name of candidates) {
    const path = join(dir, name);
    if (existsSync(path)) return path;
  }
  return undefined;
}

function resolveMadeForKids(
  settings: Pick<PublishingEngineSettings, "madeForKids">,
  overrides: PublishMetadataOverrides,
): boolean {
  if (overrides.madeForKids !== undefined) return overrides.madeForKids;
  const env = process.env.YOUTUBE_MADE_FOR_KIDS?.trim().toLowerCase();
  if (env === "true" || env === "1" || env === "yes") return true;
  if (env === "false" || env === "0" || env === "no") return false;
  return settings.madeForKids ?? false;
}

function resolveAiDisclosure(
  settings: Pick<PublishingEngineSettings, "aiDisclosure">,
  overrides: PublishMetadataOverrides,
): boolean {
  if (overrides.containsSyntheticMedia !== undefined) {
    return overrides.containsSyntheticMedia;
  }
  const env = process.env.YOUTUBE_AI_DISCLOSURE?.trim().toLowerCase();
  if (env === "false" || env === "0" || env === "no") return false;
  if (env === "true" || env === "1" || env === "yes") return true;
  return settings.aiDisclosure ?? true;
}

function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const normalized = tag.replace(/^#/, "").trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}
