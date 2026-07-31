#!/usr/bin/env node
/**
 * CLI: Thumbnail Engine 2.0 — variants + live cover + optional YouTube status.
 *
 *   node --import tsx/esm content-engine/thumbnail-engine/cli.ts \
 *     --out=./out --title="Daily Learning" --video=./final.mp4
 */

import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { makeContentPackage } from "../storyboard/test-fixtures.js";
import { runThumbnailEngine } from "./engine.js";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

const outDir = resolve(arg("out") || "./thumbnail-out");
const title = arg("title") || "AmyNest AI Daily Learning";
const videoPath = arg("video") ? resolve(arg("video")!) : undefined;
const videoId = arg("video-id");
const accessToken = arg("access-token") || process.env.YOUTUBE_ACCESS_TOKEN;
const applyCover = arg("cover") !== "0";
const headline = arg("headline");
const statusWaitMs = Number(arg("status-wait-ms") || "0");
const skipStatus = arg("skip-status") === "1";

mkdirSync(outDir, { recursive: true });

const base = makeContentPackage();
const content = makeContentPackage({
  ...base,
  title,
  hook: title,
  topic: {
    ...base.topic,
    title,
    keywords: [...base.topic.keywords, ...title.toLowerCase().split(/\s+/)],
  },
});

const pack = await runThumbnailEngine({
  contentPackage: content,
  outputDir: outDir,
  videoPath,
  applyCover: Boolean(videoPath) && applyCover,
  liveCover: true,
  variants: true,
  headlineOverride: headline,
  youtube:
    videoId && accessToken
      ? {
          videoId,
          accessToken,
          statusWaitMs: Number.isFinite(statusWaitMs) ? statusWaitMs : 0,
          skipStatusCheck: skipStatus,
        }
      : undefined,
});

console.log(`THUMBNAIL_JPG=${pack.assets.jpgPath}`);
console.log(`THUMBNAIL_REPORT=${pack.reportPath}`);
console.log(
  `THUMBNAIL_INTELLIGENCE_REPORT=${pack.intelligence?.intelligenceReportPath ?? ""}`,
);
console.log(`CHOSEN_VARIANT=${pack.intelligence?.chosenVariant ?? ""}`);
console.log(`PREDICTED_CTR=${pack.intelligence?.predictedCtr ?? ""}`);
console.log(`THUMBNAIL_UPLOAD_SUCCESS=${pack.upload.success}`);
console.log(`FIRST_FRAME_SIMILARITY=${pack.firstFrameSimilarity}`);
console.log(`LIVE_COVER=${pack.intelligence?.liveCover ?? false}`);
if (pack.coverApplied && videoPath) {
  console.log(
    `VIDEO_WITH_COVER=${resolve(outDir, "video-with-thumbnail-cover.mp4")}`,
  );
}
console.log(pack.summary);
