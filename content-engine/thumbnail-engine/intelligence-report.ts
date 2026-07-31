/**
 * THUMBNAIL_INTELLIGENCE_REPORT.md — CTR + Shorts cover evidence.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ThumbnailEnginePackage } from "./types.js";

export function writeThumbnailIntelligenceReport(
  pack: ThumbnailEnginePackage,
  outputDir: string,
): string {
  const path = join(outputDir, "THUMBNAIL_INTELLIGENCE_REPORT.md");
  const intel = pack.intelligence;
  if (!intel) {
    writeFileSync(
      path,
      "# AmyNest Thumbnail Intelligence Report\n\nIntelligence layer not run.\n",
      "utf8",
    );
    return path;
  }

  const m = intel.metrics;
  const yt = intel.youtubeStatus;
  const rows = intel.variants
    .map(
      (v) =>
        `| ${v.id} | ${v.focus} | ${v.interaction} | ${v.headline} | ${v.predictedCtr}% | ${v.quality.ok ? "PASS" : "FAIL"} |`,
    )
    .join("\n");

  const body = [
    "# AmyNest Thumbnail Intelligence Report",
    "",
    `**Engine:** ${pack.version}`,
    `**Created:** ${pack.createdAt}`,
    `**Title:** ${pack.title}`,
    "",
    "## Chosen variant",
    "",
    `- **Variant:** ${intel.chosenVariant}`,
    `- **Headline:** ${pack.headline}`,
    `- **Partner:** ${pack.partner}`,
    `- **Predicted CTR:** ${intel.predictedCtr}% (target > 10%)`,
    `- **Live cover:** ${intel.liveCover}`,
    `- **Hook alignment:** ${intel.hookAlignment}`,
    "",
    "## A/B variants",
    "",
    "| ID | Focus | Interaction | Headline | Pred. CTR | Quality |",
    "|---|---|---|---|---|---|",
    rows,
    "",
    "## Quality metrics (chosen)",
    "",
    `| Metric | Score |`,
    `|---|---|`,
    `| Face size % | ${m.faceSizePercent} |`,
    `| Eye visibility | ${m.eyeVisibility} |`,
    `| Headline readability | ${m.headlineReadability} |`,
    `| Contrast | ${m.contrast} |`,
    `| Mobile preview (120px) | ${m.mobilePreview120} |`,
    `| Safe area (Shorts/Reels/TikTok) | ${m.safeArea} |`,
    `| Character visibility | ${m.characterVisibility} |`,
    `| Logo visibility | ${m.logoVisibility} |`,
    `| Store badge visibility | ${m.storeBadgeVisibility} |`,
    `| Relationship (Amy↔child) | ${m.relationshipScore} |`,
    "",
    "## First-frame / Shorts cover",
    "",
    `- **First-frame similarity:** ${intel.firstFrameSimilarity}/100`,
    `- **Cover applied:** ${pack.coverApplied}`,
    `- **Thumbnail ≡ opening design:** ${intel.firstFrameSimilarity >= 85 ? "YES" : "NEEDS ATTENTION"}`,
    "",
    "## YouTube thumbnail status",
    "",
    `- **Checked:** ${yt.checked}`,
    `- **Waited:** ${yt.waitedMs} ms`,
    `- **Custom thumbnail applied:** ${yt.customThumbnailApplied}`,
    `- **Shorts likely uses first frame:** ${yt.shortsLikelyUsesFirstFrame}`,
    `- **Evidence:** ${yt.evidence}`,
    yt.thumbnailUrls
      ? Object.entries(yt.thumbnailUrls)
          .map(([k, u]) => `  - ${k}: ${u}`)
          .join("\n")
      : "",
    "",
    "## Upload",
    "",
    `- **Success:** ${pack.upload.success}`,
    `- **Log:** ${pack.upload.logLine}`,
    pack.upload.reason ? `- **Reason:** ${pack.upload.reason}` : "",
    "",
    "## Assets",
    "",
    `- JPG: \`${pack.assets.jpgPath}\``,
    `- WebP: \`${pack.assets.webpPath}\``,
    `- Preview: \`${pack.assets.previewPath}\``,
    `- Mobile 120px: \`${pack.assets.mobilePreviewPath ?? "(n/a)"}\``,
    `- Live cover clip: \`${pack.assets.coverClipPath ?? "(n/a)"}\``,
    "",
    "## Summary",
    "",
    pack.summary,
    "",
  ]
    .filter((l) => l !== "")
    .join("\n");

  writeFileSync(path, body, "utf8");
  return path;
}
