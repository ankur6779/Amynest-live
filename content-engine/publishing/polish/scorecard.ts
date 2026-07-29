import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { PublishMetadata } from "../../types/published-video.js";
import type { PublishingPolish, PublishingScorecard } from "./types.js";

export function buildScorecard(polish: Omit<PublishingPolish, "scorecard">): PublishingScorecard {
  const seoScore = polish.seo.score;
  const metadataScore = clamp(
    Math.round(
      (polish.localizations.en.title ? 20 : 0) +
        (polish.localizations.hi.title ? 15 : 0) +
        (polish.pinnedComment.length > 40 ? 15 : 0) +
        (polish.titleVariants.length >= 5 ? 15 : 0) +
        (polish.descriptionVariants.long.length > 200 ? 15 : 0) +
        (polish.hashtags.all.length >= 8 ? 10 : 5) +
        (polish.thumbnailTitle.split(/\s+/).length <= 4 ? 10 : 0),
    ),
  );
  const ctrPrediction = polish.seo.ctrPotential;
  const searchability = clamp(
    Math.round(
      polish.seo.keywords * 0.4 + polish.seo.tags * 0.35 + polish.seo.description * 0.25,
    ),
  );
  const parentAppeal = clamp(
    Math.round(
      60 +
        (/parent|calm|habit|learning|routine/i.test(polish.localizations.en.title)
          ? 15
          : 0) +
        (polish.hashtags.trending.length >= 3 ? 10 : 0) +
        (polish.seo.description >= 70 ? 10 : 0),
    ),
  );

  const improvements: string[] = [];
  if (seoScore < 80) {
    improvements.push("Strengthen title emotion + keep AmyNest AI within 70 chars.");
  }
  if (polish.seo.description < 75) {
    improvements.push("Keep the long SEO description with full store links and hashtags.");
  }
  if (polish.hashtags.all.length < 12) {
    improvements.push("Add more topic hashtags (still cap at 15 total).");
  }
  if (polish.bestUploadTime.source === "default") {
    improvements.push(
      "Feed Continuous Learning performance history to refine best upload hour beyond 7:00 PM IST.",
    );
  }
  if (ctrPrediction < 70) {
    improvements.push(
      `Test thumbnail overlay "${polish.thumbnailTitle}" against alternate 2–3 word variants.`,
    );
  }
  if (improvements.length === 0) {
    improvements.push("Metadata is strong — ship and let Continuous Learning pick the winning title variant.");
  }

  return {
    metadataScore,
    seoScore,
    ctrPrediction,
    searchability,
    parentAppeal,
    suggestedImprovements: improvements,
  };
}

/** Write YOUTUBE_PUBLISHING_SCORECARD.md */
export function writeYouTubePublishingScorecard(input: {
  metadata: PublishMetadata;
  polish: PublishingPolish;
  outputDirectory: string;
  fileName?: string;
}): string {
  const path = join(
    input.outputDirectory,
    input.fileName ?? "YOUTUBE_PUBLISHING_SCORECARD.md",
  );
  mkdirSync(dirname(path), { recursive: true });
  const { polish, metadata } = input;
  const sc = polish.scorecard;

  const body = [
    "# YOUTUBE_PUBLISHING_SCORECARD",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Scores",
    "",
    `| Metric | Score |`,
    `|---|---:|`,
    `| Metadata score | ${sc.metadataScore}/100 |`,
    `| SEO score | ${sc.seoScore}/100 |`,
    `| CTR prediction | ${sc.ctrPrediction}/100 |`,
    `| Searchability | ${sc.searchability}/100 |`,
    `| Parent appeal | ${sc.parentAppeal}/100 |`,
    "",
    "## Selected publish metadata",
    "",
    `**Title:** ${metadata.title}`,
    "",
    `**Thumbnail title:** ${polish.thumbnailTitle}`,
    "",
    `**Playlist:** ${metadata.playlistName ?? metadata.playlistId}`,
    "",
    `**Made for Kids:** ${metadata.madeForKids}`,
    "",
    `**AI disclosure:** ${metadata.containsSyntheticMedia}`,
    "",
    "## Best upload time",
    "",
    `- ${polish.bestUploadTime.label}`,
    `- Weekday: ${polish.bestUploadTime.weekday}`,
    `- Hour: ${String(polish.bestUploadTime.hour).padStart(2, "0")}:${String(polish.bestUploadTime.minute).padStart(2, "0")}`,
    `- Timezone: ${polish.bestUploadTime.timezone}`,
    `- Source: ${polish.bestUploadTime.source}`,
    "",
    "## Title variants (Continuous Learning)",
    "",
    ...polish.titleVariants.map((t, i) => `${i + 1}. ${t}`),
    "",
    "## Description variants",
    "",
    "### Short",
    "",
    "```",
    polish.descriptionVariants.short,
    "```",
    "",
    "### Medium",
    "",
    "```",
    polish.descriptionVariants.medium,
    "```",
    "",
    "### Long SEO",
    "",
    "```",
    polish.descriptionVariants.long.slice(0, 1200) +
      (polish.descriptionVariants.long.length > 1200 ? "\n…" : ""),
    "```",
    "",
    "## Localizations",
    "",
    "### English",
    "",
    `- Title: ${polish.localizations.en.title}`,
    "",
    "### Hindi",
    "",
    `- Title: ${polish.localizations.hi.title}`,
    "",
    "## Hashtags (max 15)",
    "",
    `- Primary: ${polish.hashtags.primary.join(" ")}`,
    `- Trending: ${polish.hashtags.trending.join(" ")}`,
    `- Topic: ${polish.hashtags.topic.join(" ")}`,
    `- All: ${polish.hashtags.all.join(" ")}`,
    "",
    "## Pinned comment",
    "",
    "```",
    polish.pinnedComment,
    "```",
    "",
    "## SEO breakdown",
    "",
    `| Dimension | Score |`,
    `|---|---:|`,
    `| Title | ${polish.seo.title} |`,
    `| Description | ${polish.seo.description} |`,
    `| Keywords | ${polish.seo.keywords} |`,
    `| Tags | ${polish.seo.tags} |`,
    `| CTR potential | ${polish.seo.ctrPotential} |`,
    "",
    ...Object.values(polish.seo.explanations).map((line) => `- ${line}`),
    "",
    "## Suggested improvements",
    "",
    ...sc.suggestedImprovements.map((s) => `- ${s}`),
    "",
  ].join("\n");

  writeFileSync(path, body, "utf8");
  return path;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
