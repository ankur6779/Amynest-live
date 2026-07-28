import type {
  ChannelPerformanceMetrics,
  VideoPerformanceMetrics,
} from "../../types/analytics.js";

export interface AggregatedVideoMetrics {
  sampleSize: number;
  averageViews: number;
  averageWatchTimeMinutes: number;
  averageViewDurationSeconds: number;
  averageRetention: number;
  averageCtr: number;
  totalSubscribersGained: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  engagementRate: number;
}

/** Aggregate per-video metrics into channel-facing rollups. */
export function aggregateVideoMetrics(
  videos: readonly VideoPerformanceMetrics[],
): AggregatedVideoMetrics {
  if (videos.length === 0) {
    return {
      sampleSize: 0,
      averageViews: 0,
      averageWatchTimeMinutes: 0,
      averageViewDurationSeconds: 0,
      averageRetention: 0,
      averageCtr: 0,
      totalSubscribersGained: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      engagementRate: 0,
    };
  }

  const sum = videos.reduce(
    (acc, v) => {
      acc.views += v.views;
      acc.watch += v.watchTimeMinutes;
      acc.avd += v.averageViewDurationSeconds;
      acc.retention += v.retention;
      acc.ctr += v.ctr;
      acc.subs += v.subscribersGained;
      acc.likes += v.likes;
      acc.comments += v.comments;
      acc.shares += v.shares;
      return acc;
    },
    {
      views: 0,
      watch: 0,
      avd: 0,
      retention: 0,
      ctr: 0,
      subs: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    },
  );

  const n = videos.length;
  const engagement =
    sum.views === 0 ? 0 : (sum.likes + sum.comments + sum.shares) / sum.views;

  return {
    sampleSize: n,
    averageViews: sum.views / n,
    averageWatchTimeMinutes: sum.watch / n,
    averageViewDurationSeconds: sum.avd / n,
    averageRetention: sum.retention / n,
    averageCtr: sum.ctr / n,
    totalSubscribersGained: sum.subs,
    totalLikes: sum.likes,
    totalComments: sum.comments,
    totalShares: sum.shares,
    engagementRate: engagement,
  };
}

export function mergeChannelWithAggregate(
  channel: ChannelPerformanceMetrics,
  aggregate: AggregatedVideoMetrics,
): ChannelPerformanceMetrics {
  return {
    ...channel,
    views: Math.max(channel.views, Math.round(aggregate.averageViews * aggregate.sampleSize)),
    watchTimeMinutes: Math.max(
      channel.watchTimeMinutes,
      Math.round(aggregate.averageWatchTimeMinutes * aggregate.sampleSize),
    ),
    averageViewDurationSeconds:
      aggregate.sampleSize > 0
        ? aggregate.averageViewDurationSeconds
        : channel.averageViewDurationSeconds,
    videosPublished: Math.max(channel.videosPublished, aggregate.sampleSize),
  };
}

export function rankVideosByViews(
  videos: readonly VideoPerformanceMetrics[],
): VideoPerformanceMetrics[] {
  return [...videos].sort((a, b) => b.views - a.views);
}
