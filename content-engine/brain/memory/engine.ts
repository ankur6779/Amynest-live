import type { AnalyticsReport } from "../../types/analytics.js";
import type { ContentMemorySnapshot } from "../../types/campaign-plan.js";
import type { VideoStyle } from "../../types/index.js";

/** Build durable content memory from analytics learning + history. */
export function buildContentMemory(input: {
  analytics: AnalyticsReport;
  publishedTopicIds?: string[];
  learningWindowDays: number;
  now?: Date;
}): ContentMemorySnapshot {
  const now = input.now ?? new Date();
  const cutoff = now.getTime() - input.learningWindowDays * 86_400_000;
  const learning = input.analytics.learningUpdates.topicPerformance.filter(
    (r) => Date.parse(r.observedAt) >= cutoff,
  );

  const topByPerf = [...learning].sort(
    (a, b) => b.performanceScore - a.performanceScore,
  );

  const winningHooks = input.analytics.contentScores
    .filter((c) => c.score.hooks >= 70)
    .slice(0, 8)
    .map((c) => `Strong hook pattern for ${c.topicId}`);

  const winningCtas = input.analytics.contentScores
    .filter((c) => c.score.cta >= 70)
    .slice(0, 8)
    .map((c) => `High-converting CTA for ${c.topicId}`);

  // Prefer analytics recommendation messages that look like hooks/CTAs when available.
  for (const rec of input.analytics.recommendations) {
    if (/hook|question/i.test(rec.message) && winningHooks.length < 10) {
      winningHooks.push(rec.message);
    }
    if (/cta/i.test(rec.message) && winningCtas.length < 10) {
      winningCtas.push(rec.message);
    }
  }

  const winningPublishHours = input.analytics.trends.publishingTimeEffectiveness
    .slice()
    .sort((a, b) => b.averageViews - a.averageViews)
    .slice(0, 5)
    .map((h) => h.hour);

  const winningVideoStyles = input.analytics.learningUpdates.videoStyles
    .slice()
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 5)
    .map((s) => s.style);

  const weakTopics = input.analytics.topicScores
    .filter((t) => t.score.overall < 40)
    .map((t) => t.topicId);

  const published = unique([
    ...(input.publishedTopicIds ?? []),
    ...learning.map((r) => r.topicId),
  ]);

  return {
    publishedTopicIds: published,
    winningHooks: unique(winningHooks).slice(0, 10),
    winningCtas: unique(winningCtas).slice(0, 10),
    winningPublishHours: unique(winningPublishHours),
    winningVideoStyles: unique(winningVideoStyles),
    avoidedTopicIds: unique([...weakTopics, ...input.analytics.trends.decliningTopics.map((t) => t.topicId)]),
    updatedAt: now.toISOString(),
  };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
