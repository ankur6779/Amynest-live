import { createHash } from "node:crypto";
import type {
  BrainRecommendation,
  CampaignSeriesPlan,
  CampaignSlot,
  ContentMemorySnapshot,
  OptimizationDecision,
  PerformancePrediction,
  RankedItem,
} from "../../types/campaign-plan.js";
import type { TopicCategory, VideoStyle } from "../../types/index.js";
import { getTopicById, getAllTopics } from "../../topics/index.js";
import { predictPerformance } from "../predictor/index.js";
import type { AnalyticsReport } from "../../types/analytics.js";

const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export function buildPublishingSchedule(input: {
  startDate: string;
  horizonDays: number;
  series: CampaignSeriesPlan[];
  rankedTopics: RankedItem[];
  memory: ContentMemorySnapshot;
  optimization: OptimizationDecision;
  analytics: AnalyticsReport;
  predictionEnabled: boolean;
}): CampaignSlot[] {
  const slots: CampaignSlot[] = [];
  const usedTopics = new Set<string>(input.memory.publishedTopicIds);
  const weeklyQuota = new Map<string, number>();

  for (let offset = 0; offset < input.horizonDays; offset++) {
    const date = addDays(input.startDate, offset);
    const day = dayName(date);
    const seriesForDay = pickSeriesForDay(input.series, day, weeklyQuota, date);
    for (const series of seriesForDay) {
      const topic = pickTopicForSeries(
        series,
        input.rankedTopics,
        usedTopics,
        input.optimization,
      );
      if (!topic) continue;
      usedTopics.add(topic.id);

      const duration = input.optimization.videoDurationSeconds;
      const publishAt = `${date}T${String(input.optimization.publishHour).padStart(2, "0")}:00:00.000Z`;
      const predicted = predictPerformance({
        analytics: input.analytics,
        category: topic.category,
        videoStyle: resolveStyle(series.kind, input.optimization.videoStyle),
        durationSeconds: duration,
        publishHour: input.optimization.publishHour,
        topicRank: input.rankedTopics.find((t) => t.id === topic.id),
        enabled: input.predictionEnabled,
      });

      slots.push({
        date,
        dayOfWeek: day,
        publishAt,
        series: series.kind,
        priorityTopicId: topic.id,
        topicTitle: topic.title,
        category: topic.category,
        recommendedHook: pickHook(input.memory, input.optimization, topic.title),
        recommendedCta: pickCta(input.memory, input.optimization),
        videoStyle: resolveStyle(series.kind, input.optimization.videoStyle),
        durationSeconds: duration,
        predicted,
      });
    }
  }

  return slots;
}

export function buildPublishingCalendar(
  slots: readonly CampaignSlot[],
): Array<{ date: string; slotCount: number; series: CampaignSlot["series"][] }> {
  const byDate = new Map<string, CampaignSlot[]>();
  for (const slot of slots) {
    const list = byDate.get(slot.date) ?? [];
    list.push(slot);
    byDate.set(slot.date, list);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySlots]) => ({
      date,
      slotCount: daySlots.length,
      series: [...new Set(daySlots.map((s) => s.series))],
    }));
}

export function buildBrainRecommendations(input: {
  optimization: OptimizationDecision;
  series: CampaignSeriesPlan[];
  memory: ContentMemorySnapshot;
}): BrainRecommendation[] {
  const recommendations: BrainRecommendation[] = [];

  for (const category of input.optimization.topicSelection.preferCategories.slice(0, 3)) {
    recommendations.push({
      id: hashId(`prefer|${category}`),
      priority: 90,
      message: `Increase ${category} videos`,
      rationale: "Rising or high-performing category from analytics",
      category,
    });
  }

  for (const category of input.optimization.topicSelection.reduceCategories.slice(0, 2)) {
    recommendations.push({
      id: hashId(`reduce|${category}`),
      priority: 70,
      message: `Reduce ${category} videos`,
      rationale: "Underperforming category trend",
      category,
    });
  }

  recommendations.push({
    id: hashId(`duration|${input.optimization.videoDurationSeconds}`),
    priority: 85,
    message: `Prefer ${input.optimization.videoDurationSeconds}-second videos`,
    rationale: "Optimized for retention on Shorts",
    durationSeconds: input.optimization.videoDurationSeconds,
  });

  recommendations.push({
    id: hashId(`hour|${input.optimization.publishHour}`),
    priority: 80,
    message: `Publish at ${formatHour(input.optimization.publishHour)}`,
    rationale: "Best historical publish-time performance",
    publishHour: input.optimization.publishHour,
  });

  if (input.optimization.openingHookStyle === "question") {
    recommendations.push({
      id: hashId("hook-question"),
      priority: 78,
      message: "Use stronger opening questions",
      rationale: "Hook scores indicate question-led openings convert better",
    });
  }

  if (input.optimization.ctaStyle === "app-demo") {
    recommendations.push({
      id: hashId("cta-friday-demo"),
      priority: 82,
      message: "Use app demo every Friday",
      rationale: "App-demo CTA style selected by optimizer",
    });
  }

  if (input.memory.winningHooks[0]) {
    recommendations.push({
      id: hashId("memory-hook"),
      priority: 60,
      message: input.memory.winningHooks[0],
      rationale: "Winning hook retained in content memory",
    });
  }

  return recommendations.sort((a, b) => b.priority - a.priority);
}

function pickSeriesForDay(
  series: CampaignSeriesPlan[],
  day: string,
  weeklyQuota: Map<string, number>,
  date: string,
): CampaignSeriesPlan[] {
  const weekKey = weekKeyFor(date);
  const selected: CampaignSeriesPlan[] = [];

  // Always try top series first.
  for (const item of series) {
    const key = `${weekKey}|${item.kind}`;
    const used = weeklyQuota.get(key) ?? 0;
    if (used >= item.slotsPerWeek) continue;

    if (day === "friday" && item.kind === "Feature Releases") {
      selected.push(item);
      weeklyQuota.set(key, used + 1);
      continue;
    }
    if ((day === "saturday" || day === "sunday") && item.kind === "Weekend Activities") {
      selected.push(item);
      weeklyQuota.set(key, used + 1);
      continue;
    }
    if (selected.length === 0) {
      selected.push(item);
      weeklyQuota.set(key, used + 1);
    }
    if (selected.length >= 2) break;
  }

  if (selected.length === 0 && series[0]) {
    selected.push(series[0]);
  }
  return selected;
}

function pickTopicForSeries(
  series: CampaignSeriesPlan,
  rankedTopics: RankedItem[],
  usedTopics: Set<string>,
  optimization: OptimizationDecision,
) {
  const topics = getAllTopics();
  for (const ranked of rankedTopics) {
    if (usedTopics.has(ranked.id)) continue;
    if (optimization.topicSelection.avoidTopicIds.includes(ranked.id)) continue;
    const topic = getTopicById(ranked.id) ?? topics.find((t) => t.id === ranked.id);
    if (!topic) continue;
    if (!series.categories.includes(topic.category as TopicCategory)) continue;
    return topic;
  }

  // Fallback: any unused topic in series categories.
  return topics.find(
    (t) =>
      series.categories.includes(t.category) &&
      !usedTopics.has(t.id) &&
      !optimization.topicSelection.avoidTopicIds.includes(t.id),
  );
}

function pickHook(
  memory: ContentMemorySnapshot,
  optimization: OptimizationDecision,
  topicTitle: string,
): string {
  if (memory.winningHooks[0]) return memory.winningHooks[0];
  if (optimization.openingHookStyle === "question") {
    return `What if ${topicTitle.toLowerCase()} felt easier this week?`;
  }
  if (optimization.openingHookStyle === "story") {
    return `A small story about ${topicTitle.toLowerCase()}...`;
  }
  return `${topicTitle} — start with one simple change.`;
}

function pickCta(
  memory: ContentMemorySnapshot,
  optimization: OptimizationDecision,
): string {
  if (memory.winningCtas[0]) return memory.winningCtas[0];
  if (optimization.ctaStyle === "app-demo") {
    return "Watch how AmyNest guides your routine — try it free";
  }
  if (optimization.ctaStyle === "direct") {
    return "Try AmyNest AI free today";
  }
  return "Explore AmyNest AI when you're ready";
}

function resolveStyle(seriesKind: string, fallback: VideoStyle): VideoStyle {
  if (seriesKind.includes("Astro")) return "astro";
  if (seriesKind.includes("Feature")) return "app-feature";
  if (seriesKind.includes("Educational")) return "listicle";
  return fallback;
}

function addDays(isoDate: string, days: number): string {
  const ms = Date.parse(`${isoDate}T00:00:00.000Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

function dayName(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00.000Z`).getUTCDay();
  return DAYS[day]!;
}

function weekKeyFor(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  const onejan = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((date.getTime() - onejan.getTime()) / 86_400_000 + onejan.getUTCDay() + 1) / 7,
  );
  return `${date.getUTCFullYear()}-W${week}`;
}

function formatHour(hour: number): string {
  const h = ((hour + 11) % 12) + 1;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${h} ${suffix}`;
}

function hashId(value: string): string {
  return `br_${createHash("sha256").update(value).digest("hex").slice(0, 10)}`;
}

export type { PerformancePrediction };
