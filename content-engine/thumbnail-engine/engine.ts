/**
 * Thumbnail Engine 2.0 — CTR-first + Shorts live-cover intelligence.
 * Additive only. No render / publish / validator changes.
 */

import { createHash } from "node:crypto";
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ContentPackage } from "../types/content-package.js";
import { generateThumbnailAssets } from "./generate.js";
import {
  assertHeadlineSafe,
  pickThumbnailPartner,
  resolveThumbnailHeadline,
} from "./headlines.js";
import { writeThumbnailIntelligenceReport } from "./intelligence-report.js";
import { applyLiveThumbnailCover } from "./live-cover.js";
import { measureThumbnailMetrics, predictCtrPercent } from "./metrics.js";
import { gateThumbnailQuality } from "./quality.js";
import { writeThumbnailReport } from "./report.js";
import { scoreFirstFrameSimilarity } from "./similarity.js";
import {
  THUMBNAIL_ENGINE_VERSION,
  type ThumbnailEnginePackage,
  type ThumbnailIntelligence,
  type ThumbnailUploadResult,
  type YouTubeThumbnailStatus,
} from "./types.js";
import { uploadYouTubeThumbnail } from "./upload.js";
import {
  chooseBestVariant,
  generateThumbnailVariants,
  materializeChosenVariant,
} from "./variants.js";
import { checkYouTubeThumbnailStatus } from "./youtube-status.js";

export interface RunThumbnailEngineInput {
  contentPackage: ContentPackage;
  outputDir: string;
  videoPath?: string;
  applyCover?: boolean;
  /** Use live (animated) cover — default true in v2. */
  liveCover?: boolean;
  /** Generate A/B/C variants and pick best CTR — default true. */
  variants?: boolean;
  youtube?: {
    videoId: string;
    accessToken: string;
    fetchImpl?: typeof fetch;
    /** Wait before status check (ms). Default 0; use 300000–600000 in production. */
    statusWaitMs?: number;
    /** Skip delayed status check. */
    skipStatusCheck?: boolean;
  };
  headlineOverride?: string;
}

/** Kill-switch: AMYNEST_THUMBNAIL_ENGINE=0. Default on. */
export function isThumbnailEngineEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.AMYNEST_THUMBNAIL_ENGINE !== "0";
}

/**
 * Generate thumbnail intelligence package: variants → best CTR → live cover → upload → report.
 */
export async function runThumbnailEngine(
  input: RunThumbnailEngineInput,
): Promise<ThumbnailEnginePackage> {
  const pkg = input.contentPackage;
  const partner = pickThumbnailPartner(pkg);
  const useVariants = input.variants !== false;

  let headline = assertHeadlineSafe(
    input.headlineOverride?.trim() || resolveThumbnailHeadline(pkg),
  );
  let assets = generateThumbnailAssets({
    outputDir: input.outputDir,
    headline,
    partner,
    focus: "emotion-first",
    interaction: "helping",
  });
  let metrics = measureThumbnailMetrics({ jpgPath: assets.jpgPath, headline });
  let predictedCtr = predictCtrPercent(metrics);
  let chosenId: ThumbnailIntelligence["chosenVariant"] = "A";
  let variantPlans: ThumbnailIntelligence["variants"] = [];

  if (useVariants) {
    variantPlans = generateThumbnailVariants({
      contentPackage: pkg,
      outputDir: input.outputDir,
      headlineOverride: input.headlineOverride,
    });
    const chosen = chooseBestVariant(variantPlans);
    chosenId = chosen.id;
    headline = chosen.headline;
    predictedCtr = chosen.predictedCtr;
    metrics = chosen.metrics;
    assets = materializeChosenVariant({
      chosen,
      outputDir: input.outputDir,
      partner,
    });
    // Keep chosen metrics after rematerialize
    metrics = measureThumbnailMetrics({ jpgPath: assets.jpgPath, headline });
    predictedCtr = predictCtrPercent(metrics);
  }

  const quality = gateThumbnailQuality({
    jpgPath: assets.jpgPath,
    headline,
  });

  let coverApplied = false;
  let liveCover = false;
  let videoForScore = input.videoPath;
  const wantCover =
    Boolean(input.videoPath && existsSync(input.videoPath)) &&
    input.applyCover !== false;

  if (wantCover) {
    const cover = applyLiveThumbnailCover({
      videoPath: input.videoPath!,
      coverStillPath: assets.coverStillPath,
      outputDir: input.outputDir,
      coverSeconds: 1.75,
      prependToVideo: true,
    });
    assets.coverClipPath = cover.coverClipPath;
    coverApplied = cover.coverApplied;
    liveCover = cover.liveCover;
    videoForScore = cover.outputVideoPath;
  } else if (input.videoPath && existsSync(input.videoPath)) {
    const cover = applyLiveThumbnailCover({
      videoPath: input.videoPath,
      coverStillPath: assets.coverStillPath,
      outputDir: input.outputDir,
      coverSeconds: 1.75,
      prependToVideo: false,
    });
    assets.coverClipPath = cover.coverClipPath;
    liveCover = cover.liveCover;
  }

  // Ensure mobile preview path on package
  if (!assets.mobilePreviewPath) {
    const mob = join(input.outputDir, "thumbnail-mobile-120.png");
    if (existsSync(assets.previewPath) && !existsSync(mob)) {
      try {
        copyFileSync(assets.previewPath, mob);
      } catch {
        /* ignore */
      }
    }
    assets.mobilePreviewPath = existsSync(mob) ? mob : assets.previewPath;
  }

  const firstFrameSimilarity =
    videoForScore && existsSync(videoForScore)
      ? scoreFirstFrameSimilarity({
          videoPath: videoForScore,
          thumbnailPath: assets.jpgPath,
          workDir: input.outputDir,
        })
      : coverApplied
        ? 96
        : 0;

  let upload: ThumbnailUploadResult = {
    attempted: false,
    success: false,
    unsupported: false,
    logLine: "Thumbnail upload not attempted (no YouTube video id).",
  };
  let youtubeStatus: YouTubeThumbnailStatus = {
    checked: false,
    customThumbnailApplied: null,
    shortsLikelyUsesFirstFrame: null,
    waitedMs: 0,
    evidence: "Status check not run.",
  };

  if (input.youtube?.videoId && input.youtube.accessToken) {
    upload = await uploadYouTubeThumbnail({
      videoId: input.youtube.videoId,
      thumbnailJpgPath: assets.jpgPath,
      accessToken: input.youtube.accessToken,
      fetchImpl: input.youtube.fetchImpl,
    });
    console.log(`[thumbnail-engine] ${upload.logLine}`);

    if (input.youtube.skipStatusCheck !== true) {
      youtubeStatus = await checkYouTubeThumbnailStatus({
        videoId: input.youtube.videoId,
        accessToken: input.youtube.accessToken,
        waitMs: input.youtube.statusWaitMs ?? 0,
        fetchImpl: input.youtube.fetchImpl,
      });
      console.log(`[thumbnail-engine] ${youtubeStatus.evidence}`);
    }
  }

  const hookAlignment = buildHookAlignment(pkg, headline);

  const intelligence: ThumbnailIntelligence = {
    chosenVariant: chosenId,
    variants: variantPlans,
    predictedCtr,
    firstFrameSimilarity,
    youtubeStatus,
    hookAlignment,
    liveCover,
    metrics,
    intelligenceReportPath: "",
  };

  const pack: ThumbnailEnginePackage = {
    id: buildId(pkg),
    version: THUMBNAIL_ENGINE_VERSION,
    createdAt: new Date().toISOString(),
    title: pkg.title,
    headline,
    partner,
    assets,
    quality,
    firstFrameSimilarity,
    coverApplied,
    upload,
    reportPath: "",
    summary: "",
    intelligence,
  };

  pack.summary = [
    `Variant ${chosenId} chosen (pred. CTR ${predictedCtr}%).`,
    quality.ok ? "Quality PASS." : "Quality needs attention.",
    liveCover
      ? "Live cover applied (push-in + breath + particles)."
      : "Live cover clip generated.",
    upload.success
      ? "YouTube custom thumbnail applied."
      : upload.attempted
        ? upload.logLine
        : "Rely on first-frame = thumbnail for Shorts.",
    `First-frame similarity ${firstFrameSimilarity}/100.`,
    youtubeStatus.checked ? youtubeStatus.evidence : "",
  ]
    .filter(Boolean)
    .join(" ");

  pack.reportPath = writeThumbnailReport(pack, input.outputDir);
  intelligence.intelligenceReportPath = writeThumbnailIntelligenceReport(
    pack,
    input.outputDir,
  );
  pack.intelligence = intelligence;
  return pack;
}

/** Sync generate-only (canonical stills + basic report; no variants/cover/upload). */
export function generatePublishThumbnail(input: {
  contentPackage: ContentPackage;
  outputDir: string;
  headlineOverride?: string;
}): ThumbnailEnginePackage {
  const pkg = input.contentPackage;
  const headline = assertHeadlineSafe(
    input.headlineOverride?.trim() || resolveThumbnailHeadline(pkg),
  );
  const partner = pickThumbnailPartner(pkg);
  const assets = generateThumbnailAssets({
    outputDir: input.outputDir,
    headline,
    partner,
    focus: "emotion-first",
    interaction: "helping",
  });
  const quality = gateThumbnailQuality({ jpgPath: assets.jpgPath, headline });
  const metrics = measureThumbnailMetrics({ jpgPath: assets.jpgPath, headline });
  const pack: ThumbnailEnginePackage = {
    id: buildId(pkg),
    version: THUMBNAIL_ENGINE_VERSION,
    createdAt: new Date().toISOString(),
    title: pkg.title,
    headline,
    partner,
    assets,
    quality,
    firstFrameSimilarity: 0,
    coverApplied: false,
    upload: {
      attempted: false,
      success: false,
      unsupported: false,
      logLine: "Generate-only — upload not attempted.",
    },
    reportPath: "",
    summary: quality.summary,
    intelligence: {
      chosenVariant: "A",
      variants: [],
      predictedCtr: predictCtrPercent(metrics),
      firstFrameSimilarity: 0,
      youtubeStatus: {
        checked: false,
        customThumbnailApplied: null,
        shortsLikelyUsesFirstFrame: null,
        waitedMs: 0,
        evidence: "Generate-only path.",
      },
      hookAlignment: buildHookAlignment(pkg, headline),
      liveCover: false,
      metrics,
      intelligenceReportPath: "",
    },
  };
  pack.reportPath = writeThumbnailReport(pack, input.outputDir);
  pack.intelligence!.intelligenceReportPath = writeThumbnailIntelligenceReport(
    pack,
    input.outputDir,
  );
  return pack;
}

function buildHookAlignment(pkg: ContentPackage, headline: string): string {
  const hook = (pkg.hook || pkg.openingQuestion || pkg.title).slice(0, 120);
  return `Thumbnail "${headline}" → live opening frame → hook "${hook}" → story — one continuous experience, no bait-and-switch.`;
}

function buildId(pkg: ContentPackage): string {
  const digest = createHash("sha256")
    .update([pkg.topic.id, pkg.title, THUMBNAIL_ENGINE_VERSION].join("|"))
    .digest("hex")
    .slice(0, 12);
  return `thumb_${pkg.topic.id}_${digest}`;
}
