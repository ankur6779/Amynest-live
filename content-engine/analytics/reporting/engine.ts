import type {
  ChannelAnalyticsSummary,
  ChannelPerformanceMetrics,
  ContentScore,
  PeriodReport,
  ReportSchedule,
  ShortsPerformanceMetrics,
  TopicScore,
  VideoAnalyticsSummary,
  VideoPerformanceMetrics,
} from "../../types/analytics.js";
import { aggregateVideoMetrics } from "../metrics/index.js";

export function buildVideoSummaries(input: {
  videos: Array<{
    videoId: string;
    title: string;
    topicId: string;
    metrics: VideoPerformanceMetrics;
  }>;
  topicScores: TopicScore[];
  contentScores: ContentScore[];
}): VideoAnalyticsSummary[] {
  const topicById = new Map(input.topicScores.map((t) => [t.topicId, t]));
  const contentByVideo = new Map(input.contentScores.map((c) => [c.videoId, c]));

  return input.videos
    .map((video) => ({
      videoId: video.videoId,
      title: video.title,
      topicId: video.topicId,
      metrics: video.metrics,
      topicScore: topicById.get(video.topicId)?.score.overall ?? 0,
      contentScore: contentByVideo.get(video.videoId)?.score.overall ?? 0,
    }))
    .sort((a, b) => b.metrics.views - a.metrics.views);
}

export function buildChannelSummary(input: {
  channel: ChannelPerformanceMetrics;
  shorts: ShortsPerformanceMetrics;
  videoSummaries: VideoAnalyticsSummary[];
}): ChannelAnalyticsSummary {
  const top = input.videoSummaries.slice(0, 5).map((v) => v.videoId);
  const worst = [...input.videoSummaries]
    .sort((a, b) => a.metrics.views - b.metrics.views)
    .slice(0, 5)
    .map((v) => v.videoId);

  const aggregate = aggregateVideoMetrics(input.videoSummaries.map((v) => v.metrics));
  const growthSummary = [
    `${input.channel.subscribers.toLocaleString()} subscribers`,
    `${Math.round(aggregate.averageViews).toLocaleString()} avg views`,
    `${(aggregate.averageCtr * 100).toFixed(1)}% avg CTR`,
    `${input.channel.shortsViews.toLocaleString()} Shorts views`,
  ].join(" · ");

  return {
    metrics: input.channel,
    shorts: input.shorts,
    topVideoIds: top,
    worstVideoIds: worst,
    growthSummary,
  };
}

export function buildPeriodReport(input: {
  schedule: ReportSchedule;
  periodStart: string;
  periodEnd: string;
  videoSummaries: VideoAnalyticsSummary[];
  channelSummary: ChannelAnalyticsSummary;
}): PeriodReport {
  const aggregate = aggregateVideoMetrics(input.videoSummaries.map((v) => v.metrics));
  return {
    schedule: input.schedule,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    topVideos: input.videoSummaries.slice(0, 5),
    worstVideos: [...input.videoSummaries]
      .sort((a, b) => a.metrics.views - b.metrics.views)
      .slice(0, 5),
    growthSummary: input.channelSummary.growthSummary,
    averageViews: aggregate.averageViews,
    averageCtr: aggregate.averageCtr,
    averageRetention: aggregate.averageRetention,
  };
}
