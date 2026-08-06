/**
 * Thumbnail Learning Engine 1.0 — CTR feedback loop orchestrator.
 * Additive only. Does not modify Thumbnail Engine, render, publish, or validators.
 */

import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { AnalyticsProvider } from "../analytics/providers/types.js";
import type { VideoPerformanceMetrics } from "../types/analytics.js";
import type { ContentPackage } from "../types/content-package.js";
import type { ThumbnailEnginePackage } from "../thumbnail-engine/types.js";
import { buildDashboard, writeDashboardHtml } from "./dashboard.js";
import { refreshAbHistory } from "./history.js";
import {
  buildLearningRecord,
  isTrustedSample,
  type IngestPublishedThumbnailInput,
} from "./ingest.js";
import { buildLearningRecommendations } from "./optimize.js";
import { annotateReasons, detectThumbnailPatterns } from "./patterns.js";
import { writeLearningReports } from "./reports.js";
import {
  DEFAULT_LEARNING_STORE_PATH,
  loadLearningStore,
  saveLearningStore,
  upsertLearningRecord,
} from "./store.js";
import {
  THUMBNAIL_LEARNING_ENGINE_VERSION,
  type ThumbnailLearningPackage,
  type ThumbnailLearningRecommendations,
  type ThumbnailLearningRecord,
} from "./types.js";

/** Kill-switch: AMYNEST_THUMBNAIL_LEARNING=0. Default on. */
export function isThumbnailLearningEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.AMYNEST_THUMBNAIL_LEARNING !== "0";
}

export interface RunThumbnailLearningEngineInput {
  /** Explicit metrics from YouTubeAnalyticsProvider / MockAnalyticsProvider. */
  metrics?: VideoPerformanceMetrics[];
  /** Or fetch via an existing analytics provider (no new API providers). */
  provider?: AnalyticsProvider;
  videoIds?: string[];
  contentByVideoId?: Record<string, ContentPackage | null | undefined>;
  thumbnailByVideoId?: Record<
    string,
    ThumbnailEnginePackage | null | undefined
  >;
  publishedAtByVideoId?: Record<string, string | undefined>;
  thumbnailPathByVideoId?: Record<string, string | undefined>;
  titleByVideoId?: Record<string, string | undefined>;
  storePath?: string;
  outputDir?: string;
  minImpressions?: number;
  /** Pattern min sample per bucket (default 2). */
  minPatternSample?: number;
}

/**
 * Ingest published video analytics → permanent store → patterns →
 * recommendations → A/B history → reports → dashboard.
 */
export async function runThumbnailLearningEngine(
  input: RunThumbnailLearningEngineInput = {},
): Promise<ThumbnailLearningPackage> {
  if (!isThumbnailLearningEnabled()) {
    return disabledPackage(input.outputDir);
  }

  const storePath = input.storePath ?? DEFAULT_LEARNING_STORE_PATH;
  const outputDir =
    input.outputDir ??
    join(process.cwd(), "out", "thumbnail-learning");
  mkdirSync(outputDir, { recursive: true });

  const minImpressions = input.minImpressions ?? 100;
  const metrics = await resolveMetrics(input);
  let store = loadLearningStore(storePath);

  let ingested = 0;
  for (const m of metrics) {
    const record = buildLearningRecord({
      videoId: m.videoId,
      title: input.titleByVideoId?.[m.videoId],
      contentPackage: input.contentByVideoId?.[m.videoId],
      thumbnailPackage: input.thumbnailByVideoId?.[m.videoId],
      metrics: m,
      publishedAt: input.publishedAtByVideoId?.[m.videoId],
      thumbnailPath: input.thumbnailPathByVideoId?.[m.videoId],
      minImpressions,
    } satisfies IngestPublishedThumbnailInput);
    store = upsertLearningRecord(store, record);
    ingested += 1;
  }

  const patterns = detectThumbnailPatterns(
    store.records,
    minImpressions,
    input.minPatternSample ?? 2,
  );
  const annotated = annotateReasons(store.records, patterns);
  store = { ...store, records: annotated };

  const recommendations = buildLearningRecommendations(annotated, patterns);
  const history = refreshAbHistory(annotated);
  const dashboard = buildDashboard(annotated, patterns);

  store = {
    ...store,
    patterns,
    recommendations,
    top100: history.topIds,
    worst100: history.worstIds,
  };
  saveLearningStore(store, storePath);

  const avgTrusted = averageCtr(annotated, minImpressions);
  const sampleSize = annotated.filter((r) =>
    isTrustedSample(r, minImpressions),
  ).length;

  const reportPaths = writeLearningReports({
    outputDir,
    pack: {
      patterns,
      recommendations,
      dashboard,
      averageCtr: avgTrusted,
      sampleSize,
      ingested,
      createdAt: new Date().toISOString(),
      version: THUMBNAIL_LEARNING_ENGINE_VERSION,
    },
    top: history.top100,
    worst: history.worst100,
    all: annotated,
  });

  const dashboardHtml = writeDashboardHtml(dashboard, outputDir);
  reportPaths.dashboardHtml = dashboardHtml;

  const id = createHash("sha256")
    .update(`tle|${store.updatedAt}|${ingested}`)
    .digest("hex")
    .slice(0, 12);

  const summary = [
    `Thumbnail Learning Engine ${THUMBNAIL_LEARNING_ENGINE_VERSION}`,
    `ingested=${ingested}`,
    `trusted=${sampleSize}`,
    `avgCTR=${(avgTrusted * 100).toFixed(2)}%`,
    `target=10%`,
    `longTerm=15%`,
  ].join(" · ");

  return {
    id: `tle_${id}`,
    version: THUMBNAIL_LEARNING_ENGINE_VERSION,
    createdAt: new Date().toISOString(),
    ingested,
    sampleSize,
    averageCtr: avgTrusted,
    patterns,
    recommendations,
    dashboard,
    reportPaths,
    summary,
  };
}

/** Load last recommendations without touching Thumbnail Engine. */
export function loadThumbnailLearningRecommendations(
  storePath: string = DEFAULT_LEARNING_STORE_PATH,
): ThumbnailLearningRecommendations | null {
  return loadLearningStore(storePath).recommendations;
}

export function loadThumbnailLearningRecords(
  storePath: string = DEFAULT_LEARNING_STORE_PATH,
): ThumbnailLearningRecord[] {
  return loadLearningStore(storePath).records;
}

async function resolveMetrics(
  input: RunThumbnailLearningEngineInput,
): Promise<VideoPerformanceMetrics[]> {
  if (input.metrics?.length) return input.metrics;
  if (input.provider && input.videoIds?.length) {
    const collected = await input.provider.collect({
      videoIds: input.videoIds,
      startDate: new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
    });
    return collected.videos;
  }
  return [];
}

function averageCtr(
  records: ThumbnailLearningRecord[],
  minImpressions: number,
): number {
  const trusted = records.filter((r) => isTrustedSample(r, minImpressions));
  if (trusted.length === 0) return 0;
  return trusted.reduce((s, r) => s + r.outcomes.ctr, 0) / trusted.length;
}

function disabledPackage(outputDir?: string): ThumbnailLearningPackage {
  const dir = outputDir ?? join(process.cwd(), "out", "thumbnail-learning");
  const emptyPatterns = detectThumbnailPatterns([]);
  const recommendations = buildLearningRecommendations([], emptyPatterns);
  const dashboard = buildDashboard([], emptyPatterns);
  return {
    id: "tle_disabled",
    version: THUMBNAIL_LEARNING_ENGINE_VERSION,
    createdAt: new Date().toISOString(),
    ingested: 0,
    sampleSize: 0,
    averageCtr: 0,
    patterns: emptyPatterns,
    recommendations,
    dashboard,
    reportPaths: {
      learning: join(dir, "THUMBNAIL_LEARNING_REPORT.md"),
      top: join(dir, "TOP_THUMBNAILS.md"),
      low: join(dir, "LOW_PERFORMING_THUMBNAILS.md"),
      monthly: join(dir, "MONTHLY_CTR_REPORT.md"),
      dashboardHtml: join(dir, "thumbnail-learning-dashboard.html"),
      recommendationsJson: join(dir, "thumbnail-learning-recommendations.json"),
    },
    summary: "Thumbnail Learning Engine disabled (AMYNEST_THUMBNAIL_LEARNING=0)",
  };
}
