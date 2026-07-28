import type { AnalyticsReport } from "../../types/analytics.js";
import type {
  CampaignSeriesKind,
  ContentMemorySnapshot,
  RankedItem,
  TrendSignal,
} from "../../types/campaign-plan.js";
import { getAllTopics } from "../../topics/index.js";

export function rankTopics(input: {
  analytics: AnalyticsReport;
  memory: ContentMemorySnapshot;
  confidenceThreshold: number;
}): RankedItem[] {
  const topics = getAllTopics();
  const scoreById = new Map(
    input.analytics.topicScores.map((t) => [t.topicId, t.score.overall]),
  );

  return topics
    .map((topic) => {
      const analyticsScore = scoreById.get(topic.id) ?? 50;
      const avoided = input.memory.avoidedTopicIds.includes(topic.id);
      const recentlyUsed = input.memory.publishedTopicIds.includes(topic.id);
      const score = clamp(
        analyticsScore +
          topic.priority * 2 -
          (avoided ? 25 : 0) -
          (recentlyUsed ? 10 : 0),
      );
      const confidence = clamp01(
        (scoreById.has(topic.id) ? 0.7 : 0.4) + (avoided ? -0.2 : 0.1),
      );
      return {
        id: topic.id,
        label: topic.title,
        score,
        confidence,
        rationale: avoided
          ? "Deprioritized due to weak historical performance"
          : recentlyUsed
            ? "Slightly reduced to avoid repetition"
            : "Ranked from analytics + topic priority",
      };
    })
    .filter((item) => item.confidence >= input.confidenceThreshold * 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 40);
}

export function rankCategories(analytics: AnalyticsReport): RankedItem[] {
  return analytics.trends.highPerformingCategories
    .map((c) => ({
      id: c.category,
      label: c.category,
      score: clamp(55 + c.scoreDelta),
      confidence: clamp01(0.45 + Math.min(0.45, c.sampleSize / 20)),
      rationale: `${c.direction} category trend (Δ ${c.scoreDelta})`,
    }))
    .sort((a, b) => b.score - a.score);
}

export function rankHooks(memory: ContentMemorySnapshot): RankedItem[] {
  return memory.winningHooks.map((hook, index) => ({
    id: `hook_${index + 1}`,
    label: hook,
    score: clamp(90 - index * 4),
    confidence: clamp01(0.8 - index * 0.05),
    rationale: "Historically high hook score",
  }));
}

export function rankCtas(memory: ContentMemorySnapshot): RankedItem[] {
  return memory.winningCtas.map((cta, index) => ({
    id: `cta_${index + 1}`,
    label: cta,
    score: clamp(88 - index * 4),
    confidence: clamp01(0.78 - index * 0.05),
    rationale: "Historically high CTA conversion",
  }));
}

export function rankCampaigns(
  series: Array<{ kind: CampaignSeriesKind; priority: number }>,
): RankedItem[] {
  return series
    .map((s) => ({
      id: s.kind,
      label: s.kind,
      score: clamp(s.priority),
      confidence: clamp01(s.priority / 100),
      rationale: "Campaign priority from planner",
    }))
    .sort((a, b) => b.score - a.score);
}

export function rankPublishingSlots(
  memory: ContentMemorySnapshot,
  analytics: AnalyticsReport,
): RankedItem[] {
  const hours =
    memory.winningPublishHours.length > 0
      ? memory.winningPublishHours
      : analytics.trends.publishingTimeEffectiveness.map((h) => h.hour);

  return unique(hours)
    .slice(0, 8)
    .map((hour, index) => {
      const sample = analytics.trends.publishingTimeEffectiveness.find(
        (h) => h.hour === hour,
      );
      return {
        id: `hour_${hour}`,
        label: `${String(hour).padStart(2, "0")}:00`,
        score: clamp(sample ? sample.averageViews / 100 : 80 - index * 5),
        confidence: clamp01(
          sample ? Math.min(0.95, 0.4 + sample.sampleSize / 10) : 0.5,
        ),
        rationale: sample
          ? `Avg views ${Math.round(sample.averageViews)}`
          : "Memory-backed publish hour",
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function boostTopicsWithTrends(
  ranked: RankedItem[],
  trends: TrendSignal[],
): RankedItem[] {
  if (trends.length === 0) return ranked;
  const boostCategories = new Set(
    trends.flatMap((t) => t.relatedCategories),
  );
  const topics = getAllTopics();
  return ranked
    .map((item) => {
      const topic = topics.find((t) => t.id === item.id);
      if (!topic || !boostCategories.has(topic.category)) return item;
      return {
        ...item,
        score: clamp(item.score + 8),
        rationale: `${item.rationale}; boosted by trend signals`,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, Number(n.toFixed(3))));
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
