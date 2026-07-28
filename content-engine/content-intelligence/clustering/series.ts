/**
 * Content clustering — map topics into recognizable audience series.
 */

import type { Topic, TopicCategory } from "../../types/index.js";
import type {
  ContentSeriesDefinition,
  ContentSeriesId,
} from "../types.js";

export const CONTENT_SERIES: ContentSeriesDefinition[] = [
  {
    id: "study-zone-mastery",
    label: "Study Zone Mastery",
    objective: "Help kids build focused learning habits",
    categories: ["Learning", "Brain Development", "Screen Time"],
    keywords: ["study", "homework", "focus", "reading", "math", "school"],
    campaignSeries: ["Educational Series"],
  },
  {
    id: "healthy-habits",
    label: "Healthy Habits",
    objective: "Nutrition, sleep, and wellness for families",
    categories: ["Nutrition", "Sleep", "Baby Care", "Safety"],
    keywords: ["health", "habit", "sleep", "food", "water", "wellness"],
    campaignSeries: ["Health Series"],
  },
  {
    id: "speech-journey",
    label: "Speech Journey",
    objective: "Support speech and language development",
    categories: ["Speech", "Child Development"],
    keywords: ["speech", "talk", "words", "pronunciation", "language"],
    campaignSeries: ["Speech Series"],
  },
  {
    id: "routine-reset",
    label: "Routine Reset",
    objective: "Calmer mornings, evenings, and daily structure",
    categories: ["Routines", "Parenting", "Emotional Intelligence"],
    keywords: ["routine", "morning", "evening", "checklist", "reset"],
    campaignSeries: ["Parenting Series"],
  },
  {
    id: "weekend-learning",
    label: "Weekend Learning",
    objective: "Fun weekend family learning moments",
    categories: ["Family Activities", "Games", "Learning"],
    keywords: ["weekend", "family", "activity", "play", "outing"],
    campaignSeries: ["Weekend Activities", "Family Challenges"],
  },
  {
    id: "brain-boost",
    label: "Brain Boost",
    objective: "Curiosity, milestones, and cognitive growth",
    categories: ["Brain Development", "Milestones", "Child Psychology"],
    keywords: ["brain", "milestone", "curious", "memory", "focus"],
    campaignSeries: ["Educational Series"],
  },
  {
    id: "astro-stories",
    label: "Astro Stories",
    objective: "Warm Amy Astro storytelling for wonder",
    categories: ["Amy Astro"],
    keywords: ["astro", "star", "sky", "birth", "cosmic"],
    campaignSeries: ["Astro Series", "Seasonal Campaigns"],
  },
  {
    id: "amy-coach-tips",
    label: "Amy Coach Tips",
    objective: "Practical coaching moments from Amy AI",
    categories: ["Parenting", "Daily Motivation", "Emotional Intelligence"],
    keywords: ["coach", "tip", "amy", "advice", "motivation"],
    campaignSeries: ["Parenting Series", "Feature Releases"],
  },
  {
    id: "audio-adventures",
    label: "Audio Adventures",
    objective: "Audio lessons and listening journeys",
    categories: ["Learning", "Speech", "Games"],
    keywords: ["audio", "listen", "podcast", "story", "sound"],
    campaignSeries: ["Educational Series", "Speech Series"],
  },
  {
    id: "premium-features",
    label: "Premium Features",
    objective: "Showcase premium AmyNest capabilities with heart",
    categories: ["Amy Astro", "Learning", "Parenting"],
    keywords: ["premium", "feature", "pro", "unlock", "upgrade"],
    campaignSeries: ["Premium Campaigns", "Feature Releases"],
  },
];

const BY_ID = new Map(CONTENT_SERIES.map((s) => [s.id, s]));

export function getSeriesDefinition(
  id: ContentSeriesId,
): ContentSeriesDefinition {
  return BY_ID.get(id) ?? CONTENT_SERIES[0]!;
}

export function clusterTopicToSeries(topic: Topic): ContentSeriesId {
  const hay = `${topic.title} ${topic.keywords.join(" ")} ${topic.cta}`.toLowerCase();
  let best: { id: ContentSeriesId; score: number } = {
    id: "amy-coach-tips",
    score: -1,
  };

  for (const series of CONTENT_SERIES) {
    let score = 0;
    if (series.categories.includes(topic.category)) score += 5;
    for (const kw of series.keywords) {
      if (hay.includes(kw)) score += 2;
    }
    if (score > best.score) best = { id: series.id, score };
  }
  return best.id;
}

export function seriesBalance(
  seriesIds: ContentSeriesId[],
): Record<ContentSeriesId, number> {
  const counts = Object.fromEntries(
    CONTENT_SERIES.map((s) => [s.id, 0]),
  ) as Record<ContentSeriesId, number>;
  for (const id of seriesIds) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}

export function categoryToDefaultSeries(
  category: TopicCategory,
): ContentSeriesId {
  for (const series of CONTENT_SERIES) {
    if (series.categories.includes(category)) return series.id;
  }
  return "amy-coach-tips";
}
