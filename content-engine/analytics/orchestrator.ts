import { createHash } from "node:crypto";
import { resolveAnalyticsSettings } from "../config/analytics.js";
import type { ContentEngineConfig, TopicCategory, VideoStyle } from "../types/index.js";
import type {
  AnalyticsInput,
  AnalyticsReport,
  ContentScore,
  TopicScore,
  VideoPerformanceMetrics,
} from "../types/analytics.js";
import { ANALYTICS_REPORT_VERSION } from "../types/analytics.js";
import { getTopicById } from "../topics/index.js";
import {
  createTelemetryEvent,
  InMemoryTelemetrySink,
  type TelemetryEvent,
  type TelemetrySink,
} from "../telemetry/index.js";
import { collectAnalytics } from "./collector/index.js";
import { exportAnalyticsReport } from "./export/index.js";
import { buildLearningSnapshot } from "./learning/index.js";
import { mergeChannelWithAggregate, aggregateVideoMetrics } from "./metrics/index.js";
import {
  InMemoryAnalyticsStore,
  type AnalyticsPersistenceStore,
} from "./persistence/index.js";
import {
  createDefaultAnalyticsRegistry,
  type AnalyticsProviderRegistry,
} from "./providers/index.js";
import {
  buildOptimizationSignals,
  buildRecommendations,
} from "./recommendations/index.js";
import {
  buildChannelSummary,
  buildPeriodReport,
  buildVideoSummaries,
} from "./reporting/index.js";
import { scoreContent, scoreTopic } from "./scoring/index.js";
import { buildAnalyticsTelemetry } from "./telemetry/index.js";
import { detectTrends, type TrendInputVideo } from "./trends/index.js";

export interface AnalyticsOrchestratorOptions {
  config: ContentEngineConfig;
  registry?: AnalyticsProviderRegistry;
  store?: AnalyticsPersistenceStore;
  telemetry?: TelemetrySink;
}

export interface AnalyticsOrchestrationResult {
  report: AnalyticsReport;
  telemetry: TelemetryEvent;
}

/**
 * Phase 8 orchestrator: PublishedVideo[] → AnalyticsReport.
 */
export class AnalyticsOrchestrator {
  private readonly config: ContentEngineConfig;
  private readonly registry: AnalyticsProviderRegistry;
  private readonly store: AnalyticsPersistenceStore;
  private readonly telemetry: TelemetrySink;

  constructor(options: AnalyticsOrchestratorOptions) {
    this.config = options.config;
    this.registry = options.registry ?? createDefaultAnalyticsRegistry();
    this.store = options.store ?? new InMemoryAnalyticsStore();
    this.telemetry = options.telemetry ?? new InMemoryTelemetrySink();
  }

  async analyze(input: AnalyticsInput): Promise<AnalyticsOrchestrationResult> {
    const started = Date.now();
    const settings = resolveAnalyticsSettings(this.config);
    const errors: string[] = [];
    const schedule = input.schedule ?? settings.reportSchedule;
    const endDate = input.endDate ?? new Date().toISOString().slice(0, 10);
    const startDate =
      input.startDate ??
      new Date(Date.now() - daysForSchedule(schedule) * 86_400_000)
        .toISOString()
        .slice(0, 10);

    const provider = await this.registry.resolveProvider(settings.analyticsProvider);
    const videoIds = input.videos.map((v) => v.videoId);

    let collectResult;
    try {
      collectResult = await collectAnalytics(provider, {
        videoIds,
        startDate,
        endDate,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
      collectResult = {
        videos: [] as VideoPerformanceMetrics[],
        channel: await provider.channel().catch(() => emptyChannel()),
        shorts: await provider.shorts().catch(() => emptyShorts()),
        apiLatencyMs: 0,
        collectionDurationMs: Date.now() - started,
        missingMetrics: videoIds.map((id) => `${id}:collection-failed`),
      };
    }

    const metricsByVideoId = new Map(
      collectResult.videos.map((m) => [m.videoId, m]),
    );

    const enriched = input.videos.map((video) => {
      const topicMeta = resolveTopicMeta(video, input);
      const metrics =
        metricsByVideoId.get(video.videoId) ??
        ({
          videoId: video.videoId,
          collectedAt: new Date().toISOString(),
          views: 0,
          watchTimeMinutes: 0,
          averageViewDurationSeconds: 0,
          averagePercentageViewed: 0,
          retention: 0,
          ctr: 0,
          subscribersGained: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          trafficSources: {
            shorts_feed: 0,
            browse: 0,
            search: 0,
            suggested: 0,
            external: 0,
            playlist: 0,
            other: 1,
          },
          returningViewers: 0,
          newViewers: 0,
          geography: {},
          deviceType: {
            mobile: 0,
            tablet: 0,
            tv: 0,
            desktop: 0,
            unknown: 0,
          },
          missingMetrics: ["all"],
        } satisfies VideoPerformanceMetrics);

      return {
        video,
        topicMeta,
        metrics,
      };
    });

    const metricsByTopic = new Map<string, VideoPerformanceMetrics[]>();
    for (const row of enriched) {
      const list = metricsByTopic.get(row.topicMeta.topicId) ?? [];
      list.push(row.metrics);
      metricsByTopic.set(row.topicMeta.topicId, list);
    }

    const topicScores: TopicScore[] = [...metricsByTopic.entries()].map(
      ([topicId, metrics]) => {
        const meta =
          enriched.find((e) => e.topicMeta.topicId === topicId)?.topicMeta ??
          {
            topicId,
            title: topicId,
            category: "Parenting" as TopicCategory,
            videoStyle: "short" as VideoStyle,
          };
        return scoreTopic({
          topicId,
          topicTitle: meta.title,
          category: meta.category,
          metrics,
        });
      },
    );

    const contentScores: ContentScore[] = enriched.map((row) =>
      scoreContent({
        videoId: row.video.videoId,
        topicId: row.topicMeta.topicId,
        content: input.contentByTopicId?.[row.topicMeta.topicId],
        metrics: row.metrics,
        durationSeconds: 30,
        sceneCount: 4,
      }),
    );

    const trendVideos: TrendInputVideo[] = enriched.map((row) => ({
      videoId: row.video.videoId,
      topicId: row.topicMeta.topicId,
      category: row.topicMeta.category,
      videoStyle: row.topicMeta.videoStyle,
      publishHour: publishHour(row.video.publishedAt ?? row.video.uploadedAt),
      metrics: row.metrics,
      topicScore:
        topicScores.find((t) => t.topicId === row.topicMeta.topicId)?.score.overall ?? 0,
    }));

    const previousTopicScores = this.store.getTopicScores();
    const trends = detectTrends({
      videos: trendVideos,
      topicScores,
      minimumSampleSize: settings.minimumSampleSize,
      previousTopicScores,
    });

    const recommendations = buildRecommendations({
      topicScores,
      contentScores,
      trends,
      minimumSampleSize: settings.minimumSampleSize,
    });

    const learningUpdates = buildLearningSnapshot({
      videos: trendVideos,
      topicScores,
      categoryTrends: trends.highPerformingCategories,
      publishingTimes: trends.publishingTimeEffectiveness,
      retentionDays: settings.learningRetentionDays,
    });

    const optimizationSignals = buildOptimizationSignals(
      recommendations,
      settings.optimizationEnabled,
    );

    const aggregate = aggregateVideoMetrics(collectResult.videos);
    const channel = mergeChannelWithAggregate(collectResult.channel, aggregate);

    const videoSummaries = buildVideoSummaries({
      videos: enriched.map((row) => ({
        videoId: row.video.videoId,
        title: row.video.metadata.title,
        topicId: row.topicMeta.topicId,
        metrics: row.metrics,
      })),
      topicScores,
      contentScores,
    });

    const channelSummary = buildChannelSummary({
      channel,
      shorts: collectResult.shorts,
      videoSummaries,
    });

    const periodReport = buildPeriodReport({
      schedule,
      periodStart: startDate,
      periodEnd: endDate,
      videoSummaries,
      channelSummary,
    });

    const analyticsTelemetry = buildAnalyticsTelemetry({
      apiLatencyMs: collectResult.apiLatencyMs,
      collectionDurationMs: collectResult.collectionDurationMs,
      missingMetrics: [
        ...collectResult.missingMetrics,
        ...collectResult.videos.flatMap((v) => v.missingMetrics),
      ],
      errors,
      provider: provider.id,
      videosAnalyzed: enriched.length,
    });

    const report: AnalyticsReport = {
      id: `ar_${createHash("sha256")
        .update(`${provider.id}|${startDate}|${endDate}|${videoIds.join(",")}`)
        .digest("hex")
        .slice(0, 12)}`,
      version: ANALYTICS_REPORT_VERSION,
      createdAt: new Date().toISOString(),
      schedule,
      channelSummary,
      videoSummaries,
      topicScores,
      contentScores,
      recommendations,
      learningUpdates,
      trends,
      periodReport,
      optimizationSignals,
      telemetry: analyticsTelemetry,
    };

    this.store.saveReport(report);
    this.store.saveLearning(learningUpdates);
    this.store.saveTopicScores(topicScores);

    const event = createTelemetryEvent({
      name: "analytics.analyze",
      generationTimeMs: Date.now() - started,
      provider: provider.id,
      errors,
      retryCount: 0,
      cacheHit: false,
      metadata: {
        apiLatencyMs: analyticsTelemetry.apiLatencyMs,
        collectionDurationMs: analyticsTelemetry.collectionDurationMs,
        missingMetrics: analyticsTelemetry.missingMetrics,
        videosAnalyzed: analyticsTelemetry.videosAnalyzed,
        recommendations: recommendations.length,
      },
    });
    this.telemetry.record(event);

    return { report, telemetry: event };
  }

  export(report: AnalyticsReport, format: "json" | "yaml" | "analytics-report-v1" = "json") {
    return exportAnalyticsReport(report, format);
  }
}

function resolveTopicMeta(
  video: AnalyticsInput["videos"][number],
  input: AnalyticsInput,
): {
  topicId: string;
  title: string;
  category: TopicCategory;
  videoStyle: VideoStyle;
} {
  const topicId =
    input.videoTopicIds?.[video.videoId] ??
    Object.entries(input.contentByTopicId ?? {}).find(([, pkg]) =>
      video.metadata.title.includes(pkg.topic.title.slice(0, 12)),
    )?.[0] ??
    Object.keys(input.topicsById ?? {})[0] ??
    inferTopicId(video);

  const fromInput = input.topicsById?.[topicId];
  if (fromInput) {
    return {
      topicId,
      title: fromInput.title,
      category: fromInput.category,
      videoStyle: fromInput.videoStyle,
    };
  }

  const known = getTopicById(topicId);
  if (known) {
    return {
      topicId: known.id,
      title: known.title,
      category: known.category,
      videoStyle: known.videoStyle,
    };
  }

  const content = input.contentByTopicId?.[topicId];
  if (content) {
    return {
      topicId: content.topic.id,
      title: content.topic.title,
      category: content.topic.category,
      videoStyle: content.topic.videoStyle,
    };
  }

  return {
    topicId,
    title: video.metadata.title,
    category: "Parenting",
    videoStyle: "short",
  };
}

function inferTopicId(video: AnalyticsInput["videos"][number]): string {
  return (
    video.renderPackageId.replace(/^rp_/, "topic_") ||
    `topic_${video.videoId}`
  );
}

function publishHour(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return 9;
  return new Date(ms).getUTCHours();
}

function daysForSchedule(schedule: AnalyticsInput["schedule"]): number {
  if (schedule === "weekly") return 7;
  if (schedule === "monthly") return 30;
  return 1;
}

function emptyChannel() {
  return {
    collectedAt: new Date().toISOString(),
    subscribers: 0,
    views: 0,
    watchTimeMinutes: 0,
    averageViewDurationSeconds: 0,
    estimatedRevenue: 0,
    shortsViews: 0,
    videosPublished: 0,
  };
}

function emptyShorts() {
  return {
    collectedAt: new Date().toISOString(),
    views: 0,
    averageViewDurationSeconds: 0,
    swipeAwayRate: 0,
    engagedViews: 0,
  };
}
