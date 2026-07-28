/**
 * Content Intelligence dashboard — editorial overview for the strategist layer.
 */

import { createHash } from "node:crypto";
import { getAllTopics } from "../../topics/index.js";
import type { Topic } from "../../types/index.js";
import { getCampaignMode } from "../campaign/modes.js";
import { clusterTopicToSeries } from "../clustering/series.js";
import { evaluateTopic } from "../scoring/topic-gate.js";
import { activeIntelligenceSeasons } from "../seasonal/engine.js";
import type {
  CampaignModeId,
  EditorialCalendar90d,
  IntelligenceDashboard,
  VideoMemoryRecord,
} from "../types.js";
import { CONTENT_INTELLIGENCE_VERSION } from "../types.js";

export function buildIntelligenceDashboard(input: {
  calendar: EditorialCalendar90d;
  memory?: VideoMemoryRecord[];
  asOfDate?: string;
  topics?: readonly Topic[];
}): IntelligenceDashboard {
  const memory = input.memory ?? [];
  const asOf = input.asOfDate ?? new Date().toISOString().slice(0, 10);
  const mode = getCampaignMode(input.calendar.campaignMode);
  const upcoming = input.calendar.days
    .filter((d) => d.date >= asOf && d.topicId)
    .slice(0, 14);

  const seriesBalance = { ...input.calendar.seriesBalance };
  const categoryDistribution = { ...input.calendar.categoryBalance };

  const completedSlots = memory.filter((m) =>
    mode.id === "none" ? false : mode.seriesIds.includes(m.seriesId),
  ).length;
  const remainingSlots = Math.max(
    0,
    (mode.durationDays || 0) - completedSlots,
  );

  const contentGaps = findContentGaps(seriesBalance, categoryDistribution);
  const repeatedThemes = findRepeatedThemes(memory);
  const topOpportunities = findTopOpportunities({
    topics: input.topics ?? getAllTopics(),
    memory,
    asOfDate: asOf,
    campaignMode: mode.id,
  });

  return {
    id: `dash_${createHash("sha256")
      .update(`${input.calendar.id}|${asOf}`)
      .digest("hex")
      .slice(0, 10)}`,
    version: CONTENT_INTELLIGENCE_VERSION,
    createdAt: new Date().toISOString(),
    upcomingVideos: upcoming,
    seriesBalance,
    categoryDistribution,
    campaignProgress: {
      mode: mode.id,
      completedSlots,
      remainingSlots,
      arc: mode.connectedArc,
    },
    contentGaps,
    repeatedThemes,
    topOpportunities,
    memorySize: memory.length,
    seasonalFocus: activeIntelligenceSeasons(asOf),
  };
}

function findContentGaps(
  seriesBalance: Record<string, number>,
  categoryDistribution: Record<string, number>,
): string[] {
  const gaps: string[] = [];
  for (const [series, count] of Object.entries(seriesBalance)) {
    if (count === 0) gaps.push(`No upcoming slots for series "${series}"`);
  }
  const cats = Object.keys(categoryDistribution);
  if (!cats.some((c) => /Speech/i.test(c))) {
    gaps.push("Speech category under-represented in the next 90 days");
  }
  if (!cats.some((c) => /Amy Astro/i.test(c))) {
    gaps.push("Astro Stories gap — schedule wonder content");
  }
  if (gaps.length === 0) gaps.push("No critical gaps — calendar is balanced");
  return gaps.slice(0, 8);
}

function findRepeatedThemes(memory: VideoMemoryRecord[]): string[] {
  const counts = new Map<string, number>();
  for (const m of memory) {
    const key = m.seriesId;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([series, n]) => `${series} repeated ${n} times in memory`);
}

function findTopOpportunities(input: {
  topics: readonly Topic[];
  memory: VideoMemoryRecord[];
  asOfDate: string;
  campaignMode: CampaignModeId;
}): IntelligenceDashboard["topOpportunities"] {
  const used = new Set(input.memory.map((m) => m.topicId));
  return input.topics
    .filter((t) => !used.has(t.id))
    .map((topic) => {
      const gate = evaluateTopic({
        topic,
        asOfDate: input.asOfDate,
        memory: input.memory,
        campaignMode: input.campaignMode,
        recentSeriesIds: input.memory.slice(-10).map((m) => m.seriesId),
      });
      return {
        topicId: topic.id,
        title: topic.title,
        score: gate.scores.overall,
        reason: gate.reasons[0] ?? getSeriesLabel(topic),
        ok: gate.ok,
      };
    })
    .filter((o) => o.ok)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ topicId, title, score, reason }) => ({
      topicId,
      title,
      score,
      reason,
    }));
}

function getSeriesLabel(topic: Topic): string {
  return `Series opportunity: ${clusterTopicToSeries(topic)}`;
}
