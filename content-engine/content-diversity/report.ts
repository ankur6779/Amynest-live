import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ContentDiversityReport, DiversityGateResult } from "./types.js";
import {
  CONTENT_DIVERSITY_VERSION,
  DIVERSITY_TARGET_SCORE,
  MAX_SIMILARITY_TO_RECENT,
} from "./types.js";

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export function buildDiversityReport(
  gate: DiversityGateResult,
  goldenScriptId?: string,
): ContentDiversityReport {
  return {
    version: CONTENT_DIVERSITY_VERSION,
    generatedAt: new Date().toISOString(),
    goldenScriptId,
    diversityScore: gate.diversityScore,
    similarityToRecent: gate.similarityToRecent,
    targetScore: DIVERSITY_TARGET_SCORE,
    maxSimilarityAllowed: MAX_SIMILARITY_TO_RECENT * 100,
    gate: gate.ok ? "PASS" : "REJECT",
    breakdown: gate.breakdown,
    locations: gate.fingerprint.locations,
    cameras: gate.fingerprint.cameras,
    amyPoses: gate.fingerprint.amyPoses,
    title: gate.metadata.title,
    playlist: gate.metadata.playlistName,
    thumbnailHero: gate.metadata.thumbnailHero,
    hashtags: gate.metadata.hashtags,
    reasons: gate.reasons,
  };
}

export function writeContentDiversityReport(
  report: ContentDiversityReport,
  outputDir: string,
): string {
  mkdirSync(outputDir, { recursive: true });
  const path = join(outputDir, "CONTENT_DIVERSITY_REPORT.md");
  const b = report.breakdown;
  const md = [
    "# CONTENT_DIVERSITY_REPORT",
    "",
    `**Status:** ${report.gate}`,
    `**Generated:** ${report.generatedAt}`,
    `**Version:** ${report.version}`,
    report.goldenScriptId ? `**Golden Script:** \`${report.goldenScriptId}\`` : "",
    "",
    "## Scores",
    "",
    `| Metric | Value | Target |`,
    `|---|---:|---:|`,
    `| Content Diversity Score | **${report.diversityScore.toFixed(1)}** | > ${report.targetScore} |`,
    `| Similarity to recent 10 | ${pct(report.similarityToRecent)} | < ${report.maxSimilarityAllowed}% |`,
    "",
    "## Similarity breakdown",
    "",
    `| Dimension | Similarity |`,
    `|---|---:|`,
    `| Scene similarity | ${pct(b.scenes)} |`,
    `| Background / location similarity | ${pct(b.backgrounds)} |`,
    `| Camera similarity | ${pct(b.cameras)} |`,
    `| Character pose similarity | ${pct(b.characterPoses)} |`,
    `| Thumbnail similarity | ${pct(b.thumbnail)} |`,
    `| Title uniqueness (inverse) | ${pct(1 - b.title)} |`,
    `| Description uniqueness (inverse) | ${pct(1 - b.description)} |`,
    `| Tag uniqueness (inverse) | ${pct(1 - b.tags)} |`,
    `| Hashtag uniqueness (inverse) | ${pct(1 - b.hashtags)} |`,
    `| CTA wording similarity | ${pct(b.cta)} |`,
    "",
    "## This Short's identity",
    "",
    `- **Locations:** ${report.locations.join(", ") || "—"}`,
    `- **Cameras:** ${report.cameras.join(", ") || "—"}`,
    `- **Amy poses:** ${report.amyPoses.join(", ") || "—"}`,
    `- **Title:** ${report.title}`,
    `- **Playlist:** ${report.playlist}`,
    `- **Thumbnail hero:** ${report.thumbnailHero}`,
    `- **Hashtags:** ${report.hashtags.join(" ")}`,
    "",
    "## Gate reasons",
    "",
    ...(report.reasons.length
      ? report.reasons.map((r) => `- ${r}`)
      : ["- None"]),
    "",
  ]
    .filter(Boolean)
    .join("\n");

  writeFileSync(path, md, "utf8");
  writeFileSync(
    join(outputDir, "content-diversity-report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  return path;
}

export function writeDiversityReportFromGate(
  gate: DiversityGateResult,
  outputDir: string,
  goldenScriptId?: string,
): string {
  const report = buildDiversityReport(gate, goldenScriptId);
  const path = writeContentDiversityReport(report, outputDir);
  gate.reportPath = path;
  return path;
}
