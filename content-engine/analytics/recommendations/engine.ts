import { createHash } from "node:crypto";
import type { TopicCategory } from "../../types/index.js";
import type {
  ContentScore,
  GrowthRecommendation,
  OptimizationSignal,
  TopicScore,
  TrendReport,
} from "../../types/analytics.js";

/** Generate actionable growth recommendations from scores and trends. */
export function buildRecommendations(input: {
  topicScores: TopicScore[];
  contentScores: ContentScore[];
  trends: TrendReport;
  minimumSampleSize: number;
}): GrowthRecommendation[] {
  const recommendations: GrowthRecommendation[] = [];

  for (const trend of input.trends.highPerformingCategories.slice(0, 3)) {
    if (trend.sampleSize < input.minimumSampleSize) continue;
    recommendations.push(
      makeRecommendation({
        kind: "prefer-category",
        priority: 90,
        message: `Use more ${trend.category} topics`,
        rationale: `${trend.category} is ${trend.direction} with score delta ${trend.scoreDelta.toFixed(1)}`,
        category: trend.category,
      }),
    );
  }

  const weakHooks = input.contentScores.filter((c) => c.score.hooks < 55);
  if (weakHooks.length >= Math.max(1, Math.floor(input.contentScores.length * 0.3))) {
    recommendations.push(
      makeRecommendation({
        kind: "improve-hook",
        priority: 85,
        message: "Improve opening hook",
        rationale: `${weakHooks.length} videos scored below 55 on hook strength`,
      }),
    );
  }

  const longVideos = input.contentScores.filter((c) => c.score.videoLength < 50);
  if (longVideos.length > 0) {
    recommendations.push(
      makeRecommendation({
        kind: "reduce-duration",
        priority: 70,
        message: "Reduce duration",
        rationale: `${longVideos.length} videos scored poorly on length fit for Shorts`,
      }),
    );
  }

  const weakCta = input.contentScores.filter((c) => c.score.cta < 55);
  if (weakCta.length > 0) {
    recommendations.push(
      makeRecommendation({
        kind: "increase-cta",
        priority: 75,
        message: "Increase CTA frequency",
        rationale: `${weakCta.length} videos underperformed on CTA effectiveness`,
      }),
    );
  }

  const appDemoSignal = input.topicScores.some(
    (t) =>
      t.category === "Amy Astro" ||
      /app|feature|demo/i.test(t.topicTitle),
  );
  if (appDemoSignal) {
    const avg = average(
      input.topicScores
        .filter((t) => /app|feature|demo|astro/i.test(t.topicTitle) || t.category === "Amy Astro")
        .map((t) => t.score.overall),
    );
    if (avg >= 65) {
      recommendations.push(
        makeRecommendation({
          kind: "prefer-app-demo",
          priority: 80,
          message: "Prefer app demonstrations",
          rationale: `App/Astro demonstration topics average score ${avg.toFixed(1)}`,
          category: "Amy Astro" as TopicCategory,
        }),
      );
    }
  }

  const bestHour = input.trends.publishingTimeEffectiveness
    .slice()
    .sort((a, b) => b.averageViews - a.averageViews)[0];
  if (bestHour && bestHour.sampleSize >= input.minimumSampleSize) {
    recommendations.push(
      makeRecommendation({
        kind: "prefer-publish-time",
        priority: 65,
        message: `Prefer publishing around ${String(bestHour.hour).padStart(2, "0")}:00`,
        rationale: `Hour ${bestHour.hour} averages ${Math.round(bestHour.averageViews)} views`,
        publishHour: bestHour.hour,
      }),
    );
  }

  for (const declining of input.trends.decliningTopics.slice(0, 3)) {
    recommendations.push(
      makeRecommendation({
        kind: "retire-topic",
        priority: 60,
        message: `Pause declining topic ${declining.topicId}`,
        rationale: `Score delta ${declining.scoreDelta.toFixed(1)} indicates decline`,
        topicId: declining.topicId,
      }),
    );
  }

  return recommendations.sort((a, b) => b.priority - a.priority);
}

export function buildOptimizationSignals(
  recommendations: readonly GrowthRecommendation[],
  enabled: boolean,
): OptimizationSignal[] {
  if (!enabled) return [];
  return recommendations.map((rec) => ({
    id: `opt_${rec.id}`,
    signal: rec.kind,
    weight: rec.priority / 100,
    appliesTo:
      rec.kind === "prefer-publish-time"
        ? "scheduling"
        : rec.kind === "improve-hook" ||
            rec.kind === "increase-cta" ||
            rec.kind === "reduce-duration"
          ? "content-generation"
          : "topic-selection",
    payload: {
      message: rec.message,
      ...(rec.category ? { category: rec.category } : {}),
      ...(rec.topicId ? { topicId: rec.topicId } : {}),
      ...(rec.publishHour !== undefined ? { publishHour: rec.publishHour } : {}),
      ...(rec.videoStyle ? { videoStyle: rec.videoStyle } : {}),
    },
  }));
}

function makeRecommendation(input: {
  kind: GrowthRecommendation["kind"];
  priority: number;
  message: string;
  rationale: string;
  category?: TopicCategory;
  topicId?: string;
  publishHour?: number;
}): GrowthRecommendation {
  const id = createHash("sha256")
    .update(`${input.kind}|${input.message}|${input.topicId ?? ""}|${input.category ?? ""}`)
    .digest("hex")
    .slice(0, 12);
  return {
    id: `rec_${id}`,
    kind: input.kind,
    priority: input.priority,
    message: input.message,
    rationale: input.rationale,
    category: input.category,
    topicId: input.topicId,
    publishHour: input.publishHour,
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
