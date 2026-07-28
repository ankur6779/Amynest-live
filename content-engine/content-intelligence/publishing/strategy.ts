/**
 * Publishing strategy recommendations — day, time, title, thumbnail, audience.
 */

import type { Topic } from "../../types/index.js";
import { clusterTopicToSeries, getSeriesDefinition } from "../clustering/series.js";
import { weekdayPillar } from "../seasonal/engine.js";
import type { PublishingStrategy } from "../types.js";

export function recommendPublishingStrategy(input: {
  topic: Topic;
  asOfDate?: string;
  preferredHour?: number;
}): PublishingStrategy {
  const topic = input.topic;
  const seriesId = clusterTopicToSeries(topic);
  const series = getSeriesDefinition(seriesId);
  const bestDay = bestDayForCategory(topic.category);
  const hour = input.preferredHour ?? defaultHour(topic.category);
  const pillar = weekdayPillar(bestDay);

  return {
    topicId: topic.id,
    bestPublishDay: bestDay,
    bestPublishTime: `${String(hour).padStart(2, "0")}:00`,
    recommendedHashtags: [
      "#AmyNest",
      "#ParentingTips",
      `#${series.label.replace(/\s+/g, "")}`,
      `#${topic.category.replace(/\s+/g, "")}`,
      "#KidsGrowth",
      "#FamilyFirst",
    ],
    suggestedTitle: craftTitle(topic),
    suggestedDescription: craftDescription(topic, series.label),
    thumbnailConcept: craftThumbnail(topic, series.label),
    primaryAudience: craftAudience(topic, pillar.pillar),
    seriesId,
  };
}

function bestDayForCategory(category: string): string {
  if (/Learning|Brain|Speech/i.test(category)) return "Monday";
  if (/Nutrition|Sleep|Baby|Safety/i.test(category)) return "Tuesday";
  if (/Speech/i.test(category)) return "Wednesday";
  if (/Games|Family Activities/i.test(category)) return "Thursday";
  if (/Routines/i.test(category)) return "Friday";
  if (/Amy Astro|Family/i.test(category)) return "Saturday";
  return "Sunday";
}

function defaultHour(category: string): number {
  if (/Routines|Sleep/i.test(category)) return 7;
  if (/Games|Family/i.test(category)) return 10;
  if (/Parenting|Emotional|Motivation/i.test(category)) return 20;
  return 18;
}

function craftTitle(topic: Topic): string {
  const base = topic.title.replace(/\s+/g, " ").trim();
  if (base.length <= 64) return base;
  return `${base.slice(0, 61).trim()}…`;
}

function craftDescription(topic: Topic, seriesLabel: string): string {
  return [
    `${topic.title} — part of AmyNest's ${seriesLabel} series.`,
    `For parents of ${topic.ageGroup} kids who want calmer, smarter habits.`,
    topic.cta,
    "Download AmyNest AI. Build Better Habits Every Day.",
  ].join("\n\n");
}

function craftThumbnail(topic: Topic, seriesLabel: string): string {
  return `Warm Pixar-inspired still: parent+child emotion in foreground, soft ${seriesLabel} motif, AmyNest purple accent, readable 3–5 word overlay from "${topic.title}" — no clutter, no fear.`;
}

function craftAudience(topic: Topic, pillar: string): string {
  return `Parents (${topic.ageGroup}) seeking ${pillar.toLowerCase()} support; warm, practical, India-first family audience`;
}
