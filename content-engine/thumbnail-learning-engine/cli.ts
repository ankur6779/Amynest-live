#!/usr/bin/env node
/**
 * CLI: Thumbnail Learning Engine — ingest real Analytics → learn CTR patterns.
 *
 *   node --import tsx/esm content-engine/thumbnail-learning-engine/cli.ts \
 *     --video-ids=id1,id2 --out=./out/thumbnail-learning
 *
 * Uses MockAnalyticsProvider when --mock=1 or no YouTube token.
 * Uses YouTubeAnalyticsProvider when YOUTUBE_ACCESS_TOKEN is set (or --access-token).
 */

import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { MockAnalyticsProvider } from "../analytics/providers/mock.js";
import { YouTubeAnalyticsProvider } from "../analytics/providers/youtube.js";
import { runThumbnailLearningEngine } from "./engine.js";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

const outDir = resolve(arg("out") || "./out/thumbnail-learning");
const storePath = arg("store")
  ? resolve(arg("store")!)
  : undefined;
const videoIds = (arg("video-ids") || "learn_thumb_a,learn_thumb_b,learn_thumb_c")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const forceMock = arg("mock") === "1";
const accessToken =
  arg("access-token") || process.env.YOUTUBE_ACCESS_TOKEN || "";
const minImpressions = Number(arg("min-impressions") || "100");

mkdirSync(outDir, { recursive: true });

const provider =
  !forceMock && accessToken
    ? new YouTubeAnalyticsProvider({ accessToken })
    : new MockAnalyticsProvider({ seed: "thumbnail-learning" });

const pack = await runThumbnailLearningEngine({
  provider,
  videoIds,
  outputDir: outDir,
  storePath,
  minImpressions: Number.isFinite(minImpressions) ? minImpressions : 100,
  minPatternSample: 1,
});

console.log(`THUMBNAIL_LEARNING_REPORT=${pack.reportPaths.learning}`);
console.log(`TOP_THUMBNAILS=${pack.reportPaths.top}`);
console.log(`LOW_PERFORMING_THUMBNAILS=${pack.reportPaths.low}`);
console.log(`MONTHLY_CTR_REPORT=${pack.reportPaths.monthly}`);
console.log(`DASHBOARD=${pack.reportPaths.dashboardHtml}`);
console.log(`RECOMMENDATIONS=${pack.reportPaths.recommendationsJson}`);
console.log(`AVG_CTR=${(pack.averageCtr * 100).toFixed(2)}%`);
console.log(`SAMPLE_SIZE=${pack.sampleSize}`);
console.log(pack.summary);
