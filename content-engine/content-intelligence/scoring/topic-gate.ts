/**
 * Pre-script content scoring — reject weak / duplicate / saturated ideas
 * before any script is generated.
 */

import type { PerformancePrediction } from "../../types/campaign-plan.js";
import { clusterTopicToSeries, getSeriesDefinition } from "../clustering/series.js";
import { seasonalBoostForTopic } from "../seasonal/engine.js";
import type {
  CampaignModeId,
  CampaignScoreBreakdown,
  ContentSeriesId,
  EvaluateTopicInput,
  TopicGateResult,
} from "../types.js";
import { getCampaignMode } from "../campaign/modes.js";

const MIN_OVERALL = 58;

export function evaluateTopic(input: EvaluateTopicInput): TopicGateResult {
  const topic = input.topic;
  const seriesId = clusterTopicToSeries(topic);
  const reasons: string[] = [];
  const rejectCodes: TopicGateResult["rejectCodes"] = [];

  const published = new Set([
    ...(input.publishedTopicIds ?? []),
    ...input.memory.map((m) => m.topicId),
  ]);
  const avoided = new Set(input.avoidedTopicIds ?? []);
  const saturated = new Set(input.saturatedTopicIds ?? []);

  const dup = input.memory.find(
    (m) =>
      m.topicId === topic.id ||
      (normalize(m.hook) === normalize(topic.title) && m.hook.length > 10),
  );
  const isDuplicate = Boolean(dup) || published.has(topic.id);
  if (isDuplicate) {
    reasons.push("Topic already in content memory — refuse duplicate video");
    rejectCodes.push("duplicate");
  }

  const isSaturated =
    saturated.has(topic.id) ||
    input.memory.filter((m) => m.seriesId === seriesId).length >= 12;
  if (isSaturated && !isDuplicate) {
    reasons.push("Series/topic appears saturated — pause before more of the same");
    rejectCodes.push("saturated");
  }

  if (avoided.has(topic.id)) {
    reasons.push("Analytics memory marks this topic as underperforming");
    rejectCodes.push("underperform-risk");
  }

  const seasonal = seasonalBoostForTopic(topic, input.asOfDate);
  const scores = scoreCampaignIdea({
    topicPriority: topic.priority,
    category: topic.category,
    keywords: topic.keywords,
    seriesId,
    recentSeriesIds: input.recentSeriesIds ?? recentSeriesFromMemory(input),
    seasonalScore: seasonal.score,
    isDuplicate,
    isSaturated,
    campaignMode: input.campaignMode ?? "none",
  });

  if (scores.overall < MIN_OVERALL) {
    reasons.push(
      `Campaign score ${scores.overall} below threshold ${MIN_OVERALL}`,
    );
    rejectCodes.push("weak-score");
  }

  if (scores.seriesBalance < 40) {
    reasons.push("Series balance too skewed — pick a different cluster");
    rejectCodes.push("series-imbalance");
  }

  const mode = getCampaignMode(input.campaignMode ?? "none");
  if (
    mode.id !== "none" &&
    !mode.seriesIds.includes(seriesId) &&
    !mode.preferCategories.includes(topic.category)
  ) {
    reasons.push(`Outside active campaign "${mode.label}" focus`);
    rejectCodes.push("audience-mismatch");
  }

  const predicted = predictFromScores(scores);
  const likelyOutperform =
    scores.overall >= 72 &&
    scores.retentionPrediction >= 65 &&
    scores.ctrPrediction >= 60 &&
    !isDuplicate;

  if (likelyOutperform) {
    reasons.push("Likely to outperform recent baseline for this series");
  }
  if (seasonal.isSeasonal) {
    reasons.push(
      `Seasonal fit: ${seasonal.events.map((e) => e.name).join(", ")}`,
    );
  }

  const ok =
    rejectCodes.length === 0 ||
    (rejectCodes.length === 1 &&
      rejectCodes[0] === "ok");

  // explicit: duplicates always fail; otherwise ok if no hard rejects
  const hardFail = rejectCodes.some((c) =>
    ["duplicate", "weak-score", "saturated", "audience-mismatch"].includes(c),
  );

  return {
    ok: !hardFail && scores.overall >= MIN_OVERALL,
    topicId: topic.id,
    topicTitle: topic.title,
    seriesId,
    scores,
    reasons: reasons.length ? reasons : ["Approved by content intelligence"],
    rejectCodes: hardFail ? rejectCodes : ["ok"],
    shouldPublish: !hardFail && scores.overall >= MIN_OVERALL,
    isSeasonal: seasonal.isSeasonal,
    isSaturated,
    likelyOutperform,
    predicted,
  };
}

export function scoreCampaignIdea(input: {
  topicPriority: number;
  category: string;
  keywords: string[];
  seriesId: ContentSeriesId;
  recentSeriesIds: ContentSeriesId[];
  seasonalScore: number;
  isDuplicate: boolean;
  isSaturated: boolean;
  campaignMode: CampaignModeId;
}): CampaignScoreBreakdown {
  const series = getSeriesDefinition(input.seriesId);
  const novelty = input.isDuplicate
    ? 10
    : input.isSaturated
      ? 35
      : clamp(55 + input.topicPriority * 4 - input.recentSeriesIds.filter((s) => s === input.seriesId).length * 8);

  const educationalValue = /Learning|Speech|Brain|Child Development|Milestones/i.test(
    input.category,
  )
    ? 78
    : 58;
  const parentValue = /Parenting|Routines|Emotional|Nutrition|Sleep|Safety/i.test(
    input.category,
  )
    ? 80
    : 60;
  const emotionalImpact = clamp(50 + input.keywords.length * 3 + input.topicPriority * 2);
  const brandValue = /Amy|Astro|Premium|Coach/i.test(
    `${input.category} ${series.label}`,
  )
    ? 82
    : 68;
  const retentionPrediction = clamp(
    50 + input.topicPriority * 3 + (input.seasonalScore > 50 ? 10 : 0),
  );
  const ctrPrediction = clamp(48 + novelty * 0.35 + input.topicPriority * 2);
  const seasonalRelevance = input.seasonalScore;
  const recentSame = input.recentSeriesIds.filter((s) => s === input.seriesId).length;
  const seriesBalance = clamp(90 - recentSame * 18);

  let overall = clamp(
    novelty * 0.14 +
      educationalValue * 0.12 +
      parentValue * 0.14 +
      emotionalImpact * 0.12 +
      brandValue * 0.1 +
      retentionPrediction * 0.12 +
      ctrPrediction * 0.1 +
      seasonalRelevance * 0.08 +
      seriesBalance * 0.08,
  );

  const mode = getCampaignMode(input.campaignMode);
  if (
    mode.id !== "none" &&
    (mode.seriesIds.includes(input.seriesId) ||
      mode.preferCategories.includes(input.category as never))
  ) {
    overall = clamp(overall + 6);
  }

  return {
    novelty: Math.round(novelty),
    educationalValue: Math.round(educationalValue),
    parentValue: Math.round(parentValue),
    emotionalImpact: Math.round(emotionalImpact),
    brandValue: Math.round(brandValue),
    retentionPrediction: Math.round(retentionPrediction),
    ctrPrediction: Math.round(ctrPrediction),
    seasonalRelevance: Math.round(seasonalRelevance),
    seriesBalance: Math.round(seriesBalance),
    overall: Math.round(overall),
  };
}

function recentSeriesFromMemory(input: EvaluateTopicInput): ContentSeriesId[] {
  return input.memory.slice(-14).map((m) => m.seriesId);
}

function predictFromScores(scores: CampaignScoreBreakdown): PerformancePrediction {
  return {
    expectedViews: Math.round(2_000 + scores.overall * 180),
    expectedRetention: scores.retentionPrediction / 100,
    expectedCtr: scores.ctrPrediction / 400,
    expectedEngagement: clamp(scores.emotionalImpact / 120, 0.02, 0.2),
    confidence: clamp(scores.overall / 100, 0.35, 0.92),
  };
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}
