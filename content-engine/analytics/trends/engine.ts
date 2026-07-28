import type { TopicCategory, VideoStyle } from "../../types/index.js";
import type {
  CategoryTrend,
  PublishTimeEffectiveness,
  TopicScore,
  TopicTrend,
  TrendReport,
  VideoPerformanceMetrics,
} from "../../types/analytics.js";

export interface TrendInputVideo {
  videoId: string;
  topicId: string;
  category: TopicCategory;
  videoStyle: VideoStyle;
  publishHour: number;
  metrics: VideoPerformanceMetrics;
  topicScore: number;
}

/** Detect category/topic trends, seasonal spikes, and publish-time effectiveness. */
export function detectTrends(input: {
  videos: TrendInputVideo[];
  topicScores: TopicScore[];
  minimumSampleSize: number;
  previousTopicScores?: TopicScore[];
}): TrendReport {
  const previous = new Map(
    (input.previousTopicScores ?? []).map((t) => [t.topicId, t.score.overall]),
  );

  const byCategory = new Map<TopicCategory, number[]>();
  for (const score of input.topicScores) {
    const list = byCategory.get(score.category) ?? [];
    list.push(score.score.overall);
    byCategory.set(score.category, list);
  }

  const highPerformingCategories: CategoryTrend[] = [...byCategory.entries()]
    .map(([category, scores]) => {
      const sampleSize = scores.length;
      const avg = average(scores);
      const direction =
        avg >= 70 ? "rising" : avg <= 45 ? "declining" : "stable";
      return {
        category,
        direction: direction as CategoryTrend["direction"],
        scoreDelta: Number((avg - 55).toFixed(2)),
        sampleSize,
      };
    })
    .filter((t) => t.sampleSize >= input.minimumSampleSize)
    .sort((a, b) => b.scoreDelta - a.scoreDelta);

  const decliningTopics: TopicTrend[] = input.topicScores
    .map((score) => {
      const prior = previous.get(score.topicId);
      const scoreDelta =
        prior === undefined ? score.score.overall - 55 : score.score.overall - prior;
      const direction =
        scoreDelta <= -8 || score.score.overall < 40
          ? "declining"
          : scoreDelta >= 8
            ? "rising"
            : "stable";
      return {
        topicId: score.topicId,
        direction: direction as TopicTrend["direction"],
        scoreDelta: Number(scoreDelta.toFixed(2)),
      };
    })
    .filter((t) => t.direction === "declining")
    .sort((a, b) => a.scoreDelta - b.scoreDelta);

  const monthBuckets = new Map<string, number[]>();
  for (const video of input.videos) {
    const month = new Date(video.metrics.collectedAt).getUTCMonth() + 1;
    const key = `${video.category}:${month}`;
    const list = monthBuckets.get(key) ?? [];
    list.push(video.topicScore);
    monthBuckets.set(key, list);
  }
  const globalAvg = average(input.videos.map((v) => v.topicScore)) || 55;
  const seasonalSpikes = [...monthBuckets.entries()]
    .map(([key, scores]) => {
      const [category, monthRaw] = key.split(":");
      const avg = average(scores);
      return {
        category: category as TopicCategory,
        month: Number(monthRaw),
        lift: Number((avg - globalAvg).toFixed(2)),
      };
    })
    .filter((s) => s.lift >= 8)
    .sort((a, b) => b.lift - a.lift);

  const hourBuckets = new Map<number, { views: number[]; ctr: number[] }>();
  for (const video of input.videos) {
    const bucket = hourBuckets.get(video.publishHour) ?? { views: [], ctr: [] };
    bucket.views.push(video.metrics.views);
    bucket.ctr.push(video.metrics.ctr);
    hourBuckets.set(video.publishHour, bucket);
  }
  const publishingTimeEffectiveness: PublishTimeEffectiveness[] = [
    ...hourBuckets.entries(),
  ]
    .map(([hour, bucket]) => ({
      hour,
      averageViews: average(bucket.views),
      averageCtr: average(bucket.ctr),
      sampleSize: bucket.views.length,
    }))
    .filter((h) => h.sampleSize >= 1)
    .sort((a, b) => b.averageViews - a.averageViews);

  return {
    highPerformingCategories,
    decliningTopics,
    seasonalSpikes,
    publishingTimeEffectiveness,
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
