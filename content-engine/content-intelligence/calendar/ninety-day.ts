/**
 * Rolling 90-day editorial calendar — balance categories, avoid similar topics close together.
 */

import { createHash } from "node:crypto";
import type { Topic, TopicCategory } from "../../types/index.js";
import { getAllTopics } from "../../topics/index.js";
import {
  categoryToDefaultSeries,
  clusterTopicToSeries,
} from "../clustering/series.js";
import { getCampaignMode } from "../campaign/modes.js";
import { evaluateTopic } from "../scoring/topic-gate.js";
import {
  activeIntelligenceSeasons,
  weekdayPillar,
} from "../seasonal/engine.js";
import type {
  CampaignModeId,
  EditorialCalendar90d,
  EditorialDayPlan,
  VideoMemoryRecord,
} from "../types.js";
import { CONTENT_INTELLIGENCE_VERSION } from "../types.js";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function buildEditorialCalendar90d(input: {
  startDate?: string;
  campaignMode?: CampaignModeId;
  memory?: VideoMemoryRecord[];
  topics?: readonly Topic[];
  publishedTopicIds?: string[];
}): EditorialCalendar90d {
  const start =
    input.startDate ??
    new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const end = addDays(start, 89);
  const mode = getCampaignMode(input.campaignMode ?? "none");
  const topics: readonly Topic[] = input.topics ?? getAllTopics();
  const memory = input.memory ?? [];
  const usedTopicIds = new Set<string>([
    ...(input.publishedTopicIds ?? []),
    ...memory.map((m) => m.topicId),
  ]);
  const recentSeries: ReturnType<typeof clusterTopicToSeries>[] = memory
    .slice(-10)
    .map((m) => m.seriesId);
  const recentCategories: TopicCategory[] = [];

  const days: EditorialDayPlan[] = [];
  const categoryBalance: Record<string, number> = {};
  const seriesBalance: Record<string, number> = {};

  for (let i = 0; i < 90; i++) {
    const date = addDays(start, i);
    const dow = DAYS[new Date(`${date}T12:00:00.000Z`).getUTCDay()]!;
    const pillar = weekdayPillar(dow);
    const seasons = activeIntelligenceSeasons(date);
    const seasonalCategories = seasons.flatMap((s) => s.recommendedCategories);

    const preferredCategories = uniqueCategories([
      ...pillar.categories,
      ...seasonalCategories.slice(0, 2),
      ...mode.preferCategories,
    ]);

    const pick = pickTopicForDay({
      topics,
      preferredCategories,
      usedTopicIds,
      recentCategories,
      recentSeries,
      asOfDate: date,
      memory,
      campaignMode: mode.id,
    });

    if (pick) {
      usedTopicIds.add(pick.topic.id);
      recentCategories.push(pick.topic.category);
      if (recentCategories.length > 7) recentCategories.shift();
      recentSeries.push(pick.seriesId);
      if (recentSeries.length > 10) recentSeries.shift();
      categoryBalance[pick.topic.category] =
        (categoryBalance[pick.topic.category] ?? 0) + 1;
      seriesBalance[pick.seriesId] = (seriesBalance[pick.seriesId] ?? 0) + 1;
    }

    days.push({
      date,
      dayOfWeek: dow,
      preferredPillar: pillar.pillar,
      preferredCategories,
      preferredSeries: preferredCategories.map(categoryToDefaultSeries),
      topicId: pick?.topic.id,
      topicTitle: pick?.topic.title,
      seriesId: pick?.seriesId,
      campaignMode: mode.id,
      score: pick?.score,
      seasonalEvents: seasons.map((s) => s.name),
    });
  }

  return {
    id: `cal90_${createHash("sha256").update(`${start}|${mode.id}`).digest("hex").slice(0, 10)}`,
    version: CONTENT_INTELLIGENCE_VERSION,
    createdAt: new Date().toISOString(),
    startDate: start,
    endDate: end,
    days,
    categoryBalance,
    seriesBalance,
    campaignMode: mode.id,
  };
}

function pickTopicForDay(input: {
  topics: readonly Topic[];
  preferredCategories: TopicCategory[];
  usedTopicIds: Set<string>;
  recentCategories: TopicCategory[];
  recentSeries: ReturnType<typeof clusterTopicToSeries>[];
  asOfDate: string;
  memory: VideoMemoryRecord[];
  campaignMode: CampaignModeId;
}): { topic: Topic; seriesId: ReturnType<typeof clusterTopicToSeries>; score: number } | null {
  const candidates = input.topics
    .filter((t) => !input.usedTopicIds.has(t.id))
    .map((topic) => {
      const gate = evaluateTopic({
        topic,
        asOfDate: input.asOfDate,
        memory: input.memory,
        publishedTopicIds: [...input.usedTopicIds],
        campaignMode: input.campaignMode,
        recentSeriesIds: input.recentSeries,
      });
      let score = gate.scores.overall;
      if (input.preferredCategories.includes(topic.category)) score += 12;
      if (input.recentCategories.includes(topic.category)) score -= 15;
      if (!gate.ok) score -= 40;
      return { topic, seriesId: gate.seriesId, score, ok: gate.ok };
    })
    .filter((c) => c.ok)
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (!best) return null;
  return { topic: best.topic, seriesId: best.seriesId, score: best.score };
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function uniqueCategories(cats: TopicCategory[]): TopicCategory[] {
  return [...new Set(cats)];
}
