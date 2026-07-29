/**
 * Normalize platform metrics into a shared performance shape.
 */

import type { VideoPerformanceMetrics } from "../../types/analytics.js";
import type { LearningPlatform, PlatformPerformance } from "../types.js";

export function normalizeYoutubeMetrics(
  metrics: VideoPerformanceMetrics,
  platform: LearningPlatform = "youtube",
): PlatformPerformance {
  const completionRate = clamp01(metrics.averagePercentageViewed || metrics.retention);
  const engagement =
    (metrics.likes + metrics.comments + metrics.shares) /
    Math.max(1, metrics.views);
  const performanceScore = clamp100(
    metrics.retention * 35 +
      metrics.ctr * 300 +
      Math.min(1, metrics.views / 20_000) * 25 +
      Math.min(1, engagement / 0.08) * 15 +
      Math.min(1, metrics.subscribersGained / 50) * 10,
  );

  const topTraffic =
    Object.entries(metrics.trafficSources ?? {})
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "other";

  // Synthetic retention curve from avg retention when raw curve unavailable.
  const retentionCurve = buildRetentionCurve(metrics.retention);

  return {
    videoId: metrics.videoId,
    platform,
    collectedAt: metrics.collectedAt,
    impressions: Math.round(metrics.views / Math.max(0.01, metrics.ctr || 0.04)),
    views: metrics.views,
    averageViewDurationSeconds: metrics.averageViewDurationSeconds,
    retention: metrics.retention,
    retentionCurve,
    completionRate,
    ctr: metrics.ctr,
    likes: metrics.likes,
    comments: metrics.comments,
    shares: metrics.shares,
    saves: Math.round(metrics.shares * 0.6),
    subscribers: metrics.subscribersGained,
    trafficSource: topTraffic,
    watchTimeMinutes: metrics.watchTimeMinutes,
    performanceScore,
    raw: metrics,
  };
}

export function synthesizeMetricsFromViews(input: {
  videoId: string;
  views: number;
  retention?: number;
  ctr?: number;
  platform?: LearningPlatform;
}): PlatformPerformance {
  const retention = input.retention ?? 0.55;
  const ctr = input.ctr ?? 0.045;
  const fake: VideoPerformanceMetrics = {
    videoId: input.videoId,
    collectedAt: new Date().toISOString(),
    views: input.views,
    watchTimeMinutes: (input.views * retention * 20) / 60,
    averageViewDurationSeconds: retention * 20,
    averagePercentageViewed: retention,
    retention,
    ctr,
    subscribersGained: Math.round(input.views * 0.002),
    likes: Math.round(input.views * 0.04),
    comments: Math.round(input.views * 0.004),
    shares: Math.round(input.views * 0.008),
    trafficSources: {
      shorts_feed: 0.6,
      browse: 0.1,
      search: 0.1,
      suggested: 0.1,
      external: 0.05,
      playlist: 0.03,
      other: 0.02,
    },
    returningViewers: Math.round(input.views * 0.2),
    newViewers: Math.round(input.views * 0.8),
    geography: { IN: 0.7, US: 0.1, OTHER: 0.2 },
    deviceType: { mobile: 0.85, tablet: 0.05, tv: 0.02, desktop: 0.07, unknown: 0.01 },
    missingMetrics: [],
  };
  return normalizeYoutubeMetrics(fake, input.platform ?? "youtube");
}

function buildRetentionCurve(retention: number): number[] {
  const points: number[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    // Typical short decay toward final retention
    const value = 1 - (1 - retention) * Math.pow(t, 0.7);
    points.push(Math.round(clamp01(value) * 100));
  }
  return points;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
