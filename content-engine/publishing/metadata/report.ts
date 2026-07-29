/**
 * Write YOUTUBE_METADATA_REPORT.md for a publish metadata package.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { PublishMetadata } from "../../types/published-video.js";
import { resolveStoreLinks } from "./store-links.js";

export function writeYouTubeMetadataReport(input: {
  metadata: PublishMetadata;
  outputDirectory: string;
  fileName?: string;
}): string {
  const links = resolveStoreLinks();
  const path = join(
    input.outputDirectory,
    input.fileName ?? "YOUTUBE_METADATA_REPORT.md",
  );
  mkdirSync(dirname(path), { recursive: true });

  const body = [
    "# YOUTUBE_METADATA_REPORT",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Title",
    "",
    input.metadata.title,
    "",
    `Length: ${input.metadata.title.length} / 70`,
    "",
    "## Description",
    "",
    "```",
    input.metadata.description,
    "```",
    "",
    "## Tags",
    "",
    `Count: ${input.metadata.tags.length}`,
    "",
    ...input.metadata.tags.map((t) => `- ${t}`),
    "",
    "## Playlist",
    "",
    `- Name: ${input.metadata.playlistName ?? "(unresolved)"}`,
    `- ID: ${input.metadata.playlistId || "(not configured — set YOUTUBE_PLAYLIST_*)"}`,
    "",
    "## Made for Kids",
    "",
    String(input.metadata.madeForKids),
    "",
    `selfDeclaredMadeForKids: ${input.metadata.selfDeclaredMadeForKids}`,
    "",
    "## AI disclosure",
    "",
    `containsSyntheticMedia: ${input.metadata.containsSyntheticMedia}`,
    "",
    `YOUTUBE_AI_DISCLOSURE env drives this flag (default enabled for AmyNest AI Shorts).`,
    "",
    "## Store / web links",
    "",
    `| Link | URL |`,
    `|---|---|`,
    `| Play Store | ${links.playStoreUrl} |`,
    `| App Store | ${links.appStoreUrl} |`,
    `| Website | ${links.websiteUrl} |`,
    `| Get App | ${links.getAppUrl} |`,
    "",
    "## Visibility / license",
    "",
    `- Visibility: ${input.metadata.visibility}`,
    `- Category: ${input.metadata.categoryId}`,
    `- License: ${input.metadata.license}`,
    `- Language: ${input.metadata.language}`,
    "",
  ].join("\n");

  writeFileSync(path, body, "utf8");
  return path;
}
