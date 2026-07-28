import { createHash } from "node:crypto";
import type {
  AnalyticsProviderHealth,
  ChannelPerformanceMetrics,
  CollectRequest,
  CollectResult,
  DeviceType,
  ShortsPerformanceMetrics,
  TrafficSource,
  VideoPerformanceMetrics,
} from "../../types/analytics.js";
import type { AnalyticsProvider } from "./types.js";

export interface MockAnalyticsProviderOptions {
  seed?: string;
  latencyMs?: number;
}

/**
 * Deterministic analytics provider for tests and offline CI.
 * Produces stable pseudo-metrics derived from video ids.
 */
export class MockAnalyticsProvider implements AnalyticsProvider {
  readonly id = "mock" as const;
  private readonly seed: string;
  private readonly latencyMs: number;

  constructor(options: MockAnalyticsProviderOptions = {}) {
    this.seed = options.seed ?? "amynest-analytics";
    this.latencyMs = options.latencyMs ?? 1;
  }

  async health(): Promise<AnalyticsProviderHealth> {
    return {
      ok: true,
      message: "MockAnalyticsProvider ready",
      checkedAt: new Date().toISOString(),
    };
  }

  async collect(request: CollectRequest): Promise<CollectResult> {
    const started = Date.now();
    await delay(this.latencyMs);
    const videos = request.videoIds.map((id) => this.buildVideo(id));
    const channel = await this.channel();
    const shorts = await this.shorts();
    return {
      videos,
      channel: {
        ...channel,
        videosPublished: request.videoIds.length,
        views: videos.reduce((sum, v) => sum + v.views, 0),
        watchTimeMinutes: videos.reduce((sum, v) => sum + v.watchTimeMinutes, 0),
        shortsViews: videos.reduce((sum, v) => sum + v.views, 0),
      },
      shorts,
      apiLatencyMs: this.latencyMs,
      collectionDurationMs: Date.now() - started,
      missingMetrics: [],
    };
  }

  async video(videoId: string): Promise<VideoPerformanceMetrics> {
    await delay(this.latencyMs);
    return this.buildVideo(videoId);
  }

  async channel(): Promise<ChannelPerformanceMetrics> {
    await delay(this.latencyMs);
    return {
      collectedAt: new Date().toISOString(),
      subscribers: 12_500,
      views: 840_000,
      watchTimeMinutes: 62_000,
      averageViewDurationSeconds: 18.4,
      estimatedRevenue: 0,
      shortsViews: 790_000,
      videosPublished: 120,
    };
  }

  async shorts(): Promise<ShortsPerformanceMetrics> {
    await delay(this.latencyMs);
    return {
      collectedAt: new Date().toISOString(),
      views: 790_000,
      averageViewDurationSeconds: 16.2,
      swipeAwayRate: 0.41,
      engagedViews: 460_000,
    };
  }

  private buildVideo(videoId: string): VideoPerformanceMetrics {
    const n = hashToUnit(`${this.seed}|${videoId}`);
    const views = Math.round(1_000 + n * 49_000);
    const avgDuration = 8 + n * 20;
    const retention = clamp01(0.35 + n * 0.5);
    const ctr = clamp01(0.02 + n * 0.08);
    const likes = Math.round(views * (0.02 + n * 0.05));
    const comments = Math.round(views * (0.002 + n * 0.01));
    const shares = Math.round(views * (0.001 + n * 0.008));
    const subscribersGained = Math.round(views * (0.001 + n * 0.004));
    const newViewers = Math.round(views * (0.55 + n * 0.2));
    const returningViewers = Math.max(0, views - newViewers);

    const trafficSources = distributeTraffic(n);
    const geography = {
      IN: Math.round(views * (0.55 + n * 0.2)),
      US: Math.round(views * (0.1 + n * 0.1)),
      GB: Math.round(views * 0.05),
      OTHER: Math.round(views * 0.1),
    };
    const deviceType: Record<DeviceType, number> = {
      mobile: Math.round(views * 0.78),
      tablet: Math.round(views * 0.08),
      tv: Math.round(views * 0.05),
      desktop: Math.round(views * 0.07),
      unknown: Math.round(views * 0.02),
    };

    return {
      videoId,
      collectedAt: new Date().toISOString(),
      views,
      watchTimeMinutes: Math.round((views * avgDuration) / 60),
      averageViewDurationSeconds: Number(avgDuration.toFixed(2)),
      averagePercentageViewed: Number((retention * 100).toFixed(2)),
      retention: Number(retention.toFixed(4)),
      ctr: Number(ctr.toFixed(4)),
      subscribersGained,
      likes,
      comments,
      shares,
      trafficSources,
      returningViewers,
      newViewers,
      geography,
      deviceType,
      missingMetrics: [],
    };
  }
}

function distributeTraffic(n: number): Record<TrafficSource, number> {
  const shorts = 0.45 + n * 0.2;
  const browse = 0.15;
  const search = 0.1 + (1 - n) * 0.1;
  const suggested = 0.12;
  const external = 0.05;
  const playlist = 0.03;
  const other = Math.max(0, 1 - (shorts + browse + search + suggested + external + playlist));
  return {
    shorts_feed: Number(shorts.toFixed(4)),
    browse: Number(browse.toFixed(4)),
    search: Number(search.toFixed(4)),
    suggested: Number(suggested.toFixed(4)),
    external: Number(external.toFixed(4)),
    playlist: Number(playlist.toFixed(4)),
    other: Number(other.toFixed(4)),
  };
}

function hashToUnit(value: string): number {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 8);
  return Number.parseInt(hex, 16) / 0xffff_ffff;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
