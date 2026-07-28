/**
 * Analytics feedback — learn winning patterns from existing brain/analytics.
 */

import { buildContentMemory } from "../../brain/memory/engine.js";
import type { AnalyticsReport } from "../../types/analytics.js";
import type { StudioAnalyticsInsights } from "../types.js";

export function buildStudioAnalyticsInsights(input: {
  analytics: AnalyticsReport;
  publishedTopicIds?: string[];
  learningWindowDays?: number;
}): StudioAnalyticsInsights {
  const memory = buildContentMemory({
    analytics: input.analytics,
    publishedTopicIds: input.publishedTopicIds,
    learningWindowDays: input.learningWindowDays ?? 30,
  });

  const winningTopics = input.analytics.topicScores
    .slice()
    .sort((a, b) => b.score.overall - a.score.overall)
    .slice(0, 12)
    .map((t) => t.topicId);

  // Duration preference from winning video styles + retention trends (no static catalog).
  const durationVotes = new Map<15 | 20 | 30, number>([
    [15, 1],
    [20, 2],
    [30, 1],
  ]);
  for (const style of input.analytics.learningUpdates.videoStyles) {
    const d = style.style === "motivation" ? 15 : style.style === "astro" ? 30 : 20;
    durationVotes.set(d, (durationVotes.get(d) ?? 0) + style.averageScore * style.sampleSize);
  }
  for (const row of input.analytics.learningUpdates.topicPerformance) {
    const d = row.retentionScore >= 80 ? 15 : row.retentionScore >= 60 ? 20 : 30;
    durationVotes.set(d, (durationVotes.get(d) ?? 0) + row.performanceScore);
  }

  const winningDurations = [...durationVotes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([d]) => d)
    .slice(0, 3);

  return {
    winningHooks: memory.winningHooks.slice(0, 10),
    winningTopics,
    winningDurations,
    winningCtas: memory.winningCtas.slice(0, 10),
    winningPublishHours: memory.winningPublishHours.slice(0, 5),
  };
}
