import type { TopicCategory, VideoStyle } from "../../types/index.js";
import type {
  AudiencePreference,
  CategoryTrend,
  LearningRecord,
  LearningStoreSnapshot,
  PublishTimeEffectiveness,
  TopicScore,
} from "../../types/analytics.js";
import type { TrendInputVideo } from "../trends/index.js";

/** Build learning updates for future topic selection and content generation. */
export function buildLearningSnapshot(input: {
  videos: TrendInputVideo[];
  topicScores: TopicScore[];
  categoryTrends: CategoryTrend[];
  publishingTimes: PublishTimeEffectiveness[];
  retentionDays: number;
  now?: Date;
}): LearningStoreSnapshot {
  const now = input.now ?? new Date();
  const cutoff = now.getTime() - input.retentionDays * 86_400_000;

  const topicPerformance: LearningRecord[] = input.videos
    .map((video) => {
      const topicScore = input.topicScores.find((t) => t.topicId === video.topicId);
      return {
        topicId: video.topicId,
        category: video.category,
        videoStyle: video.videoStyle,
        publishHour: video.publishHour,
        performanceScore: topicScore?.score.performance ?? video.topicScore,
        retentionScore: topicScore?.score.retention ?? video.metrics.retention * 100,
        engagementScore: topicScore?.score.engagement ?? 0,
        observedAt: video.metrics.collectedAt,
        videoId: video.videoId,
      };
    })
    .filter((record) => Date.parse(record.observedAt) >= cutoff);

  const styleBuckets = new Map<VideoStyle, number[]>();
  for (const record of topicPerformance) {
    const list = styleBuckets.get(record.videoStyle) ?? [];
    list.push(record.performanceScore);
    styleBuckets.set(record.videoStyle, list);
  }

  const videoStyles = [...styleBuckets.entries()].map(([style, scores]) => ({
    style,
    averageScore: average(scores),
    sampleSize: scores.length,
  }));

  const audiencePreferences = buildAudiencePreferences(input.videos);

  return {
    topicPerformance,
    categoryTrends: input.categoryTrends,
    publishingTimes: input.publishingTimes,
    videoStyles,
    audiencePreferences,
    updatedAt: now.toISOString(),
  };
}

/** Convert learning into preferred-category weights for topic selection. */
export function preferredCategoriesFromLearning(
  snapshot: LearningStoreSnapshot,
  limit = 5,
): TopicCategory[] {
  return snapshot.categoryTrends
    .slice()
    .sort((a, b) => b.scoreDelta - a.scoreDelta)
    .slice(0, limit)
    .map((t) => t.category);
}

function buildAudiencePreferences(videos: TrendInputVideo[]): AudiencePreference[] {
  const geo = new Map<string, number>();
  const device = new Map<string, number>();
  for (const video of videos) {
    for (const [country, count] of Object.entries(video.metrics.geography)) {
      geo.set(country, (geo.get(country) ?? 0) + count);
    }
    for (const [type, count] of Object.entries(video.metrics.deviceType)) {
      device.set(type, (device.get(type) ?? 0) + count);
    }
  }

  const now = new Date().toISOString();
  const prefs: AudiencePreference[] = [];
  const topGeo = [...geo.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topGeo) {
    prefs.push({
      key: "geography",
      value: topGeo[0],
      weight: topGeo[1],
      updatedAt: now,
    });
  }
  const topDevice = [...device.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topDevice) {
    prefs.push({
      key: "device",
      value: topDevice[0],
      weight: topDevice[1],
      updatedAt: now,
    });
  }
  return prefs;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
