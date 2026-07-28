import type { AnalyticsReport } from "../../types/analytics.js";
import type {
  PerformancePrediction,
  RankedItem,
} from "../../types/campaign-plan.js";
import type { TopicCategory, VideoStyle } from "../../types/index.js";

export interface PredictionInput {
  analytics: AnalyticsReport;
  category: TopicCategory;
  videoStyle: VideoStyle;
  durationSeconds: number;
  publishHour: number;
  topicRank?: RankedItem;
  enabled: boolean;
}

/** Estimate expected performance before publishing. */
export function predictPerformance(input: PredictionInput): PerformancePrediction {
  if (!input.enabled) {
    return {
      expectedViews: 0,
      expectedRetention: 0,
      expectedCtr: 0,
      expectedEngagement: 0,
      confidence: 0,
    };
  }

  const baselineViews = Math.max(
    500,
    input.analytics.periodReport.averageViews || 5_000,
  );
  const baselineRetention = input.analytics.periodReport.averageRetention || 0.5;
  const baselineCtr = input.analytics.periodReport.averageCtr || 0.04;

  const categoryBoost =
    input.analytics.trends.highPerformingCategories.find(
      (c) => c.category === input.category,
    )?.scoreDelta ?? 0;

  const hourBoost =
    input.analytics.trends.publishingTimeEffectiveness.find(
      (h) => h.hour === input.publishHour,
    )?.averageCtr ?? baselineCtr;

  const durationFactor =
    input.durationSeconds === 20 ? 1.08 : input.durationSeconds === 15 ? 1.02 : 0.96;
  const styleFactor =
    input.videoStyle === "astro" || input.videoStyle === "app-feature" ? 1.05 : 1;
  const rankFactor = input.topicRank ? 0.9 + input.topicRank.score / 500 : 1;

  const expectedViews = Math.round(
    baselineViews *
      durationFactor *
      styleFactor *
      rankFactor *
      (1 + categoryBoost / 100),
  );
  const expectedRetention = clamp01(
    baselineRetention + (input.durationSeconds <= 20 ? 0.04 : -0.02),
  );
  const expectedCtr = clamp01((baselineCtr + hourBoost) / 2 + categoryBoost / 1000);
  const expectedEngagement = clamp01(expectedCtr * 1.8 + expectedRetention * 0.2);
  const confidence = clamp01(
    0.45 +
      (input.analytics.topicScores.length > 0 ? 0.2 : 0) +
      (input.topicRank ? input.topicRank.confidence * 0.25 : 0) +
      (input.analytics.periodReport.topVideos.length > 0 ? 0.1 : 0),
  );

  return {
    expectedViews,
    expectedRetention: Number(expectedRetention.toFixed(4)),
    expectedCtr: Number(expectedCtr.toFixed(4)),
    expectedEngagement: Number(expectedEngagement.toFixed(4)),
    confidence: Number(confidence.toFixed(3)),
  };
}

export function aggregateExpectedPerformance(
  predictions: PerformancePrediction[],
): PerformancePrediction {
  if (predictions.length === 0) {
    return {
      expectedViews: 0,
      expectedRetention: 0,
      expectedCtr: 0,
      expectedEngagement: 0,
      confidence: 0,
    };
  }
  const n = predictions.length;
  return {
    expectedViews: Math.round(
      predictions.reduce((s, p) => s + p.expectedViews, 0) / n,
    ),
    expectedRetention: Number(
      (predictions.reduce((s, p) => s + p.expectedRetention, 0) / n).toFixed(4),
    ),
    expectedCtr: Number(
      (predictions.reduce((s, p) => s + p.expectedCtr, 0) / n).toFixed(4),
    ),
    expectedEngagement: Number(
      (predictions.reduce((s, p) => s + p.expectedEngagement, 0) / n).toFixed(4),
    ),
    confidence: Number(
      (predictions.reduce((s, p) => s + p.confidence, 0) / n).toFixed(3),
    ),
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
