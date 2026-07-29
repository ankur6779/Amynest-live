/**
 * Continuous Learning Engine — feedback layer above production.
 * Call after publish + metrics collection. Does not modify production modules.
 */

import type { AnalyticsReport, VideoPerformanceMetrics } from "../types/analytics.js";
import type { ContentPackage } from "../types/content-package.js";
import type { PublishedVideo } from "../types/published-video.js";
import { correlateDnaWithPerformance } from "./correlate/engine.js";
import { extractVideoDna } from "./dna/engine.js";
import { isContinuousLearningEnabled } from "./enable.js";
import { planLearningExperiments } from "./experiments/engine.js";
import { analyzeFailures } from "./failure/engine.js";
import {
  InMemoryKnowledgeBaseStore,
  type KnowledgeBaseStore,
} from "./knowledge/store.js";
import { normalizeYoutubeMetrics } from "./metrics/normalize.js";
import { buildPromptOptimizationHints } from "./prompts/optimizer.js";
import { buildMonthlyEvolutionReport } from "./report/monthly.js";
import type {
  ContinuousLearningResult,
  KnowledgeEntry,
  PlatformPerformance,
  PromptOptimizationHints,
  VideoDna,
} from "./types.js";
import { CONTINUOUS_LEARNING_VERSION } from "./types.js";

export interface ContinuousLearningIngestInput {
  videos: PublishedVideo[];
  /** Preferred: full analytics report already produced by Phase 8. */
  analytics?: AnalyticsReport;
  /** Raw YouTube metrics and/or already-normalized platform performance. */
  metrics?: Array<VideoPerformanceMetrics | PlatformPerformance>;
  contentByVideoId?: Record<string, ContentPackage>;
  videoTopicIds?: Record<string, string>;
  goldenScriptIdByVideoId?: Record<string, string>;
  campaignByVideoId?: Record<string, string>;
  /** YYYY-MM — when set, attach monthly evolution report. */
  month?: string;
}

export interface ContinuousLearningEngineOptions {
  knowledge?: KnowledgeBaseStore;
}

/**
 * Additive learning facade. Ingest published performance → improve future prompts.
 */
export class ContinuousLearningEngine {
  private readonly knowledge: KnowledgeBaseStore;
  private readonly dnaByVideo = new Map<string, VideoDna>();
  private lastHints: PromptOptimizationHints | null = null;
  private lastResult: ContinuousLearningResult | null = null;

  constructor(options: ContinuousLearningEngineOptions = {}) {
    this.knowledge = options.knowledge ?? new InMemoryKnowledgeBaseStore();
  }

  getKnowledgeBase(): KnowledgeEntry[] {
    return this.knowledge.list();
  }

  getPromptHints(): PromptOptimizationHints | null {
    return this.lastHints;
  }

  getLastResult(): ContinuousLearningResult | null {
    return this.lastResult;
  }

  listDna(): VideoDna[] {
    return [...this.dnaByVideo.values()];
  }

  /**
   * Learn from published videos + real metrics.
   * No-op when AMYNEST_CONTINUOUS_LEARNING=0.
   */
  ingest(input: ContinuousLearningIngestInput): ContinuousLearningResult {
    if (!isContinuousLearningEnabled()) {
      const empty = emptyResult();
      this.lastResult = empty;
      return empty;
    }

    const performances = resolvePerformances(input);

    const dnaProfiles = input.videos.map((video) => {
      const content = input.contentByVideoId?.[video.videoId];
      const dna = extractVideoDna({
        video,
        content,
        topicId: input.videoTopicIds?.[video.videoId] ?? content?.topic.id,
        goldenScriptId: input.goldenScriptIdByVideoId?.[video.videoId] ?? null,
        campaign: input.campaignByVideoId?.[video.videoId] ?? "evergreen",
      });
      this.dnaByVideo.set(dna.videoId, dna);
      return dna;
    });

    const correlations = correlateDnaWithPerformance(dnaProfiles, performances);
    this.knowledge.rememberFromLearning({
      dnaList: dnaProfiles,
      performances,
      correlations,
    });
    const knowledge = this.knowledge.list();
    const promptHints = buildPromptOptimizationHints({
      correlations,
      knowledge,
    });
    this.lastHints = promptHints;

    const experiments = planLearningExperiments({
      analytics: input.analytics,
      correlations,
      promptHints,
    });

    const titlesByVideoId = Object.fromEntries(
      input.videos.map((v) => [v.videoId, v.metadata.title]),
    );
    const failures = analyzeFailures({
      dnaList: dnaProfiles,
      performances,
      titlesByVideoId,
    });

    const month = input.month ?? new Date().toISOString().slice(0, 7);
    const monthlyReport = buildMonthlyEvolutionReport({
      month,
      dnaList: dnaProfiles,
      performances,
      correlations,
      failures,
      promptHints,
      titlesByVideoId,
    });

    const result: ContinuousLearningResult = {
      version: CONTINUOUS_LEARNING_VERSION,
      generatedAt: new Date().toISOString(),
      dnaProfiles,
      performances,
      correlations,
      knowledge,
      promptHints,
      experiments,
      failures,
      monthlyReport,
    };
    this.lastResult = result;
    return result;
  }

  buildMonthlyReport(month: string): ReturnType<typeof buildMonthlyEvolutionReport> {
    const dnaList = this.listDna();
    const last = this.lastResult;
    if (!last) {
      return buildMonthlyEvolutionReport({
        month,
        dnaList,
        performances: [],
        correlations: [],
        failures: [],
        promptHints: buildPromptOptimizationHints({
          correlations: [],
          knowledge: this.knowledge.list(),
        }),
      });
    }
    return buildMonthlyEvolutionReport({
      month,
      dnaList: last.dnaProfiles,
      performances: last.performances,
      correlations: last.correlations,
      failures: last.failures,
      promptHints: last.promptHints,
    });
  }
}

function isPlatformPerformance(
  value: VideoPerformanceMetrics | PlatformPerformance,
): value is PlatformPerformance {
  return (
    typeof value === "object" &&
    value !== null &&
    "performanceScore" in value &&
    "retentionCurve" in value
  );
}

function resolvePerformances(
  input: ContinuousLearningIngestInput,
): PlatformPerformance[] {
  if (input.metrics && input.metrics.length > 0) {
    return input.metrics.map((m) =>
      isPlatformPerformance(m) ? m : normalizeYoutubeMetrics(m),
    );
  }
  if (input.analytics?.videoSummaries?.length) {
    return input.analytics.videoSummaries.map((row) =>
      normalizeYoutubeMetrics(row.metrics),
    );
  }
  // No metrics yet — synthesize mild baselines so DNA still persists.
  return input.videos.map((v, index) =>
    normalizeYoutubeMetrics({
      videoId: v.videoId,
      collectedAt: new Date().toISOString(),
      views: 1000 + index * 250,
      watchTimeMinutes: 200,
      averageViewDurationSeconds: 12,
      averagePercentageViewed: 0.55,
      retention: 0.55 - index * 0.03,
      ctr: 0.05 - index * 0.002,
      subscribersGained: 5,
      likes: 40,
      comments: 4,
      shares: 6,
      trafficSources: {
        shorts_feed: 0.7,
        browse: 0.1,
        search: 0.05,
        suggested: 0.05,
        external: 0.05,
        playlist: 0.03,
        other: 0.02,
      },
      returningViewers: 200,
      newViewers: 800,
      geography: { IN: 1 },
      deviceType: {
        mobile: 0.9,
        tablet: 0.05,
        tv: 0,
        desktop: 0.05,
        unknown: 0,
      },
      missingMetrics: ["synthetic-baseline"],
    }),
  );
}

function emptyResult(): ContinuousLearningResult {
  return {
    version: CONTINUOUS_LEARNING_VERSION,
    generatedAt: new Date().toISOString(),
    dnaProfiles: [],
    performances: [],
    correlations: [],
    knowledge: [],
    promptHints: buildPromptOptimizationHints({
      correlations: [],
      knowledge: [],
    }),
    experiments: [],
    failures: [],
  };
}
