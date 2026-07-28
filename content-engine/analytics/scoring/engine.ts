import type { TopicCategory } from "../../types/index.js";
import type { ContentPackage } from "../../types/content-package.js";
import type {
  ContentScore,
  TopicScore,
  VideoPerformanceMetrics,
} from "../../types/analytics.js";

export interface TopicScoreInput {
  topicId: string;
  topicTitle: string;
  category: TopicCategory;
  metrics: VideoPerformanceMetrics[];
  now?: Date;
}

export interface ContentScoreInput {
  videoId: string;
  topicId: string;
  content?: ContentPackage;
  metrics: VideoPerformanceMetrics;
  durationSeconds?: number;
  sceneCount?: number;
}

/** Score a topic 0–100 across performance, retention, engagement, growth, freshness. */
export function scoreTopic(input: TopicScoreInput): TopicScore {
  const sampleSize = input.metrics.length;
  if (sampleSize === 0) {
    return {
      topicId: input.topicId,
      topicTitle: input.topicTitle,
      category: input.category,
      sampleSize: 0,
      score: {
        performance: 0,
        retention: 0,
        engagement: 0,
        growth: 0,
        freshness: 50,
        overall: 0,
      },
      updatedAt: (input.now ?? new Date()).toISOString(),
    };
  }

  const avgViews =
    input.metrics.reduce((s, m) => s + m.views, 0) / sampleSize;
  const avgRetention =
    input.metrics.reduce((s, m) => s + m.retention, 0) / sampleSize;
  const avgCtr = input.metrics.reduce((s, m) => s + m.ctr, 0) / sampleSize;
  const avgEngagement =
    input.metrics.reduce((s, m) => {
      const denom = Math.max(1, m.views);
      return s + (m.likes + m.comments + m.shares) / denom;
    }, 0) / sampleSize;
  const avgSubs =
    input.metrics.reduce((s, m) => s + m.subscribersGained, 0) / sampleSize;

  const performance = clampScore(scale(avgViews, 1_000, 40_000) * 100);
  const retention = clampScore(avgRetention * 100);
  const engagement = clampScore(scale(avgEngagement, 0.01, 0.12) * 70 + avgCtr * 300);
  const growth = clampScore(scale(avgSubs, 1, 200) * 100);
  const freshness = freshnessScore(input.metrics, input.now ?? new Date());
  const overall = clampScore(
    performance * 0.3 +
      retention * 0.25 +
      engagement * 0.2 +
      growth * 0.15 +
      freshness * 0.1,
  );

  return {
    topicId: input.topicId,
    topicTitle: input.topicTitle,
    category: input.category,
    sampleSize,
    score: {
      performance,
      retention,
      engagement,
      growth,
      freshness,
      overall,
    },
    updatedAt: (input.now ?? new Date()).toISOString(),
  };
}

/** Score hooks/CTA/titles/descriptions/hashtags/length/pace for a video. */
export function scoreContent(input: ContentScoreInput): ContentScore {
  const content = input.content;
  const m = input.metrics;

  const hooks = content
    ? clampScore(
        (content.hook.length >= 20 ? 70 : 40) +
          (content.openingQuestion.includes("?") ? 20 : 0) +
          m.ctr * 200,
      )
    : clampScore(50 + m.ctr * 300);

  const cta = content
    ? clampScore(
        (content.cta.toLowerCase().includes("amynest") ? 70 : 40) +
          (content.description.toLowerCase().includes("try") ? 15 : 0) +
          (m.subscribersGained > 0 ? 15 : 0),
      )
    : clampScore(45 + Math.min(30, m.subscribersGained));

  const titles = content
    ? clampScore(
        (content.title.length >= 20 && content.title.length <= 70 ? 75 : 45) +
          (content.alternateTitles.length >= 3 ? 15 : 0) +
          m.ctr * 150,
      )
    : clampScore(50 + m.ctr * 250);

  const descriptions = content
    ? clampScore(
        (content.description.length >= 80 ? 70 : 40) +
          (content.hashtags.length >= 5 ? 15 : 0) +
          (content.keywords.length >= 3 ? 10 : 0),
      )
    : 50;

  const hashtags = content
    ? clampScore(
        Math.min(100, content.hashtags.length * 8) +
          (content.hashtags.some((h) => /amynest/i.test(h)) ? 20 : 0),
      )
    : 50;

  const duration = input.durationSeconds ?? 30;
  const videoLength = clampScore(
    duration >= 15 && duration <= 35 ? 85 : duration < 15 ? 55 : 45,
  );

  const sceneCount = input.sceneCount ?? 4;
  const scenePace = clampScore(
    sceneCount >= 3 && sceneCount <= 7
      ? 80 + m.retention * 20
      : 50 + m.retention * 30,
  );

  const overall = clampScore(
    hooks * 0.2 +
      cta * 0.15 +
      titles * 0.2 +
      descriptions * 0.1 +
      hashtags * 0.1 +
      videoLength * 0.1 +
      scenePace * 0.15,
  );

  return {
    videoId: input.videoId,
    topicId: input.topicId,
    score: {
      hooks,
      cta,
      titles,
      descriptions,
      hashtags,
      videoLength,
      scenePace,
      overall,
    },
    updatedAt: new Date().toISOString(),
  };
}

function freshnessScore(
  metrics: readonly VideoPerformanceMetrics[],
  now: Date,
): number {
  const latest = metrics
    .map((m) => Date.parse(m.collectedAt))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => b - a)[0];
  if (!latest) return 50;
  const ageDays = (now.getTime() - latest) / 86_400_000;
  if (ageDays <= 7) return 95;
  if (ageDays <= 30) return 75;
  if (ageDays <= 90) return 55;
  return 30;
}

function scale(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
