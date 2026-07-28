import type { AnalyticsReport } from "../../types/analytics.js";
import type {
  ContentMemorySnapshot,
  OptimizationDecision,
  RankedItem,
} from "../../types/campaign-plan.js";
import type { TopicCategory, VideoStyle } from "../../types/index.js";

/** Derive automatic optimization decisions for future generation. */
export function buildOptimizationDecision(input: {
  analytics: AnalyticsReport;
  memory: ContentMemorySnapshot;
  rankedTopics: RankedItem[];
  rankedCategories: RankedItem[];
  enabled: boolean;
}): OptimizationDecision {
  const rising = input.analytics.trends.highPerformingCategories
    .filter((c) => c.direction === "rising")
    .map((c) => c.category);
  const declining = input.analytics.topicScores
    .filter((t) => t.score.overall < 45)
    .map((t) => t.category);

  const preferCategories = unique([
    ...rising,
    ...input.rankedCategories.slice(0, 3).map((c) => c.id as TopicCategory),
  ]).slice(0, 5);

  const reduceCategories = unique(
    declining.filter((c) => !preferCategories.includes(c)),
  ).slice(0, 4);

  const durationSeconds = chooseDuration(input.analytics);
  const publishHour =
    input.memory.winningPublishHours[0] ??
    input.analytics.trends.publishingTimeEffectiveness[0]?.hour ??
    20;

  const videoStyle =
    input.memory.winningVideoStyles[0] ??
    (preferCategories.includes("Amy Astro") ? "astro" : "short");

  const weakHooks = input.analytics.contentScores.filter((c) => c.score.hooks < 55);
  const weakCta = input.analytics.contentScores.filter((c) => c.score.cta < 55);
  const openingHookStyle =
    weakHooks.length > input.analytics.contentScores.length / 3
      ? "question"
      : "bold-claim";
  const ctaStyle =
    weakCta.length > 0
      ? "app-demo"
      : preferCategories.includes("Amy Astro")
        ? "app-demo"
        : "soft";

  const scenePace =
    durationSeconds <= 20 ? "brisk" : durationSeconds >= 30 ? "calm" : "balanced";

  const signals = input.enabled
    ? [
        ...input.analytics.optimizationSignals,
        {
          id: "brain_duration",
          signal: "prefer-duration",
          weight: 0.8,
          appliesTo: "content-generation" as const,
          payload: { durationSeconds },
        },
        {
          id: "brain_publish_hour",
          signal: "prefer-publish-time",
          weight: 0.75,
          appliesTo: "scheduling" as const,
          payload: { publishHour },
        },
      ]
    : [];

  return {
    topicSelection: {
      preferCategories,
      reduceCategories,
      preferTopicIds: input.rankedTopics.slice(0, 10).map((t) => t.id),
      avoidTopicIds: unique([
        ...input.memory.avoidedTopicIds,
        ...input.analytics.trends.decliningTopics.map((t) => t.topicId),
      ]),
    },
    videoDurationSeconds: durationSeconds,
    openingHookStyle,
    ctaStyle,
    publishHour,
    videoStyle: videoStyle as VideoStyle,
    scenePace,
    categoryRotationBoost: preferCategories,
    signals,
  };
}

function chooseDuration(analytics: AnalyticsReport): 15 | 20 | 30 {
  const avgRetention = analytics.periodReport.averageRetention || 0.5;
  if (avgRetention < 0.45) return 15;
  if (avgRetention < 0.6) return 20;
  return 30;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
