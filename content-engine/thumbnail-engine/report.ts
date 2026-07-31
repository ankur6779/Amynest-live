/**
 * Write THUMBNAIL_REPORT.md for each run.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ThumbnailEnginePackage } from "./types.js";

export function writeThumbnailReport(
  pack: ThumbnailEnginePackage,
  outputDir: string,
): string {
  const path = join(outputDir, "THUMBNAIL_REPORT.md");
  const uploadStatus = pack.upload.success
    ? "SUCCESS"
    : pack.upload.attempted
      ? "FAILURE"
      : "NOT_ATTEMPTED";

  const body = [
    "# AmyNest Thumbnail Report",
    "",
    `**Engine:** ${pack.version}`,
    `**Created:** ${pack.createdAt}`,
    `**Video title:** ${pack.title}`,
    `**Headline:** ${pack.headline}`,
    `**Partner:** ${pack.partner}`,
    "",
    "## Assets",
    "",
    `| File | Path |`,
    `|---|---|`,
    `| JPG (1280×720) | \`${pack.assets.jpgPath}\` |`,
    `| WebP | \`${pack.assets.webpPath}\` |`,
    `| Preview PNG | \`${pack.assets.previewPath}\` |`,
    `| Cover still | \`${pack.assets.coverStillPath}\` |`,
    pack.assets.coverClipPath
      ? `| Cover clip | \`${pack.assets.coverClipPath}\` |`
      : null,
    "",
    "## Quality",
    "",
    `- **OK:** ${pack.quality.ok}`,
    `- **Score:** ${pack.quality.score}`,
    `- **Summary:** ${pack.quality.summary}`,
    pack.quality.rejects.length
      ? pack.quality.rejects.map((r) => `- Reject \`${r.code}\`: ${r.reason}`).join("\n")
      : "- No rejects",
    "",
    "## YouTube thumbnail upload",
    "",
    `- **Status:** ${uploadStatus}`,
    `- **Success:** ${pack.upload.success}`,
    `- **Unsupported / Shorts fallback:** ${pack.upload.unsupported}`,
    pack.upload.httpStatus != null
      ? `- **HTTP status:** ${pack.upload.httpStatus}`
      : null,
    pack.upload.reason ? `- **Reason if rejected:** ${pack.upload.reason}` : null,
    `- **Log:** ${pack.upload.logLine}`,
    "",
    "### API response",
    "",
    "```",
    pack.upload.apiResponse?.trim() || "(none)",
    "```",
    "",
    "## First-frame cover strategy",
    "",
    `- **Cover applied to video:** ${pack.coverApplied}`,
    `- **First-frame similarity score:** ${pack.firstFrameSimilarity}/100`,
    "",
    pack.firstFrameSimilarity >= 70
      ? "Opening frame closely matches the thumbnail design — auto-selected YouTube previews should look professional."
      : "Similarity below 70 — ensure cover prepend ran, or regenerate with matching composition.",
    "",
    "## Summary",
    "",
    pack.summary,
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");

  writeFileSync(path, body, "utf8");
  return path;
}
