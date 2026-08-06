/**
 * Learning reports — markdown artifacts only (no pipeline changes).
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  ThumbnailLearningDashboard,
  ThumbnailLearningPackage,
  ThumbnailLearningPatterns,
  ThumbnailLearningRecord,
  ThumbnailLearningRecommendations,
} from "./types.js";

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

export function writeLearningReports(input: {
  outputDir: string;
  pack: Omit<ThumbnailLearningPackage, "reportPaths" | "summary" | "id"> & {
    id?: string;
    summary?: string;
  };
  top: ThumbnailLearningRecord[];
  worst: ThumbnailLearningRecord[];
  all: ThumbnailLearningRecord[];
}): ThumbnailLearningPackage["reportPaths"] {
  const learning = join(input.outputDir, "THUMBNAIL_LEARNING_REPORT.md");
  const topPath = join(input.outputDir, "TOP_THUMBNAILS.md");
  const lowPath = join(input.outputDir, "LOW_PERFORMING_THUMBNAILS.md");
  const monthly = join(input.outputDir, "MONTHLY_CTR_REPORT.md");
  const recommendationsJson = join(
    input.outputDir,
    "thumbnail-learning-recommendations.json",
  );

  writeFileSync(
    learning,
    renderLearningReport(
      input.pack.patterns,
      input.pack.recommendations,
      input.pack.dashboard,
      input.pack.averageCtr,
      input.pack.sampleSize,
    ),
    "utf8",
  );
  writeFileSync(topPath, renderRankedList("Top Thumbnails", input.top), "utf8");
  writeFileSync(
    lowPath,
    renderRankedList("Low-Performing Thumbnails", input.worst),
    "utf8",
  );
  writeFileSync(
    monthly,
    renderMonthlyReport(input.all, input.pack.dashboard),
    "utf8",
  );
  writeFileSync(
    recommendationsJson,
    JSON.stringify(input.pack.recommendations, null, 2),
    "utf8",
  );

  return {
    learning,
    top: topPath,
    low: lowPath,
    monthly,
    dashboardHtml: join(input.outputDir, "thumbnail-learning-dashboard.html"),
    recommendationsJson,
  };
}

function renderLearningReport(
  patterns: ThumbnailLearningPatterns,
  recommendations: ThumbnailLearningRecommendations,
  dashboard: ThumbnailLearningDashboard,
  averageCtr: number,
  sampleSize: number,
): string {
  const section = (title: string, winners: { value: string; averageCtr: number; sampleSize: number }[]) =>
    [
      `### ${title}`,
      "",
      winners.length
        ? winners
            .map(
              (w, i) =>
                `${i + 1}. **${w.value}** — CTR ${pct(w.averageCtr)} (n=${w.sampleSize})`,
            )
            .join("\n")
        : "_Insufficient trusted samples yet._",
      "",
    ].join("\n");

  return [
    "# Thumbnail Learning Report",
    "",
    `**Average CTR:** ${pct(averageCtr)}`,
    `**Trusted sample size:** ${sampleSize}`,
    `**Target:** ${pct(recommendations.targetCtr)} · **Long-term:** ${pct(recommendations.longTermTargetCtr)}`,
    "",
    "## Pattern detection (real Analytics only)",
    "",
    section("Headline length", patterns.headlineLength),
    section("Emotions", patterns.emotions),
    section("Characters", patterns.characters),
    section("Backgrounds", patterns.backgrounds),
    section("Colors", patterns.colors),
    section("Headline styles", patterns.headlineStyles),
    section("CTA styles", patterns.ctaStyles),
    section("Layouts / framing", patterns.layouts),
    "",
    "## Auto-optimization recommendations",
    "",
    "These are written for future thumbnail generation. Thumbnail Engine code is **not** modified.",
    "",
    `- Layouts: ${recommendations.highestCtrLayouts.join(", ") || "—"}`,
    `- Colors: ${recommendations.highestCtrColors.join(", ") || "—"}`,
    `- Character placement: ${recommendations.highestCtrCharacterPlacement.join(", ") || "—"}`,
    `- Headline styles: ${recommendations.highestCtrHeadlineStyle.join(", ") || "—"}`,
    `- Framing: ${recommendations.highestCtrFraming.join(", ") || "—"}`,
    `- Emotions: ${recommendations.highestCtrEmotions.join(", ") || "—"}`,
    `- Preferred headline length: ${recommendations.preferredHeadlineLength ?? "—"}`,
    `- Preferred CTA style: ${recommendations.preferredCtaStyle ?? "—"}`,
    "",
    ...recommendations.notes.map((n) => `- ${n}`),
    "",
    "## Dashboard snapshot",
    "",
    `- Winning headlines: ${dashboard.winningHeadlines
      .slice(0, 5)
      .map((h) => `${h.headline} (${pct(h.averageCtr)})`)
      .join("; ") || "—"}`,
    "",
  ].join("\n");
}

function renderRankedList(
  title: string,
  records: ThumbnailLearningRecord[],
): string {
  const lines = records.map((r, i) => {
    const reasons = r.reasons.length ? r.reasons.join(", ") : "—";
    return [
      `## ${i + 1}. ${r.title}`,
      "",
      `- **Video ID:** ${r.videoId}`,
      `- **CTR:** ${pct(r.outcomes.ctr)}`,
      `- **Impressions:** ${r.outcomes.impressions}`,
      `- **Views:** ${r.outcomes.views}`,
      `- **Watch time (min):** ${r.outcomes.watchTimeMinutes.toFixed(1)}`,
      `- **Avg view duration (s):** ${r.outcomes.averageViewDurationSeconds.toFixed(1)}`,
      `- **Retention:** ${pct(r.outcomes.retention)}`,
      `- **Variant:** ${r.features.variant}`,
      `- **Headline:** ${r.features.headline} (${r.features.headlineLength} words)`,
      `- **Emotion:** ${r.features.emotion}`,
      `- **Characters:** ${r.features.characters}`,
      `- **Face size %:** ${r.features.faceSizePercent}`,
      `- **Eye contact:** ${r.features.eyeContact}`,
      `- **Background:** ${r.features.backgroundType}`,
      `- **Palette:** ${r.features.colorPalette}`,
      `- **Topic:** ${r.features.topic}`,
      `- **Day / time:** ${r.features.day} ${r.features.time}`,
      `- **Reasons:** ${reasons}`,
      "",
    ].join("\n");
  });

  return [`# ${title}`, "", `Count: ${records.length}`, "", ...lines].join("\n");
}

function renderMonthlyReport(
  records: ThumbnailLearningRecord[],
  dashboard: ThumbnailLearningDashboard,
): string {
  const byMonth = new Map<string, ThumbnailLearningRecord[]>();
  for (const record of records) {
    const month = record.features.day.slice(0, 7);
    const list = byMonth.get(month) ?? [];
    list.push(record);
    byMonth.set(month, list);
  }

  const months = [...byMonth.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, list]) => {
      const avg =
        list.reduce((s, r) => s + r.outcomes.ctr, 0) / Math.max(1, list.length);
      return `### ${month}\n\n- Videos: ${list.length}\n- Average CTR: ${pct(avg)}\n`;
    });

  return [
    "# Monthly CTR Report",
    "",
    `Overall average CTR (trusted): ${pct(dashboard.averageCtr)}`,
    `Sample size: ${dashboard.sampleSize}`,
    "",
    ...months,
    months.length ? "" : "_No monthly buckets yet._",
    "",
  ].join("\n");
}
