/**
 * Seasonal engine — prioritize topics for school, festivals, weekends, milestones.
 * Additive over brain seasonal events.
 */

import {
  activeSeasonalEvents,
  listSeasonalEvents,
} from "../../brain/seasonal/index.js";
import type { SeasonalEvent } from "../../types/campaign-plan.js";
import type { Topic, TopicCategory } from "../../types/index.js";

/** Extra AmyNest editorial seasons on top of brain's seasonal calendar. */
export function listIntelligenceSeasonalEvents(year: number): SeasonalEvent[] {
  const base = listSeasonalEvents("IN", year);
  const extra: SeasonalEvent[] = [
    event(
      "back-to-school",
      "school-calendar",
      "Back to School",
      `${year}-06-01`,
      `${year}-07-15`,
      ["Educational Series", "Parenting Series", "Speech Series"],
      ["Learning", "Routines", "Speech", "Parenting"],
    ),
    event(
      "childrens-day",
      "national-event",
      "Children's Day",
      `${year}-11-10`,
      `${year}-11-16`,
      ["Family Challenges", "Educational Series", "Weekend Activities"],
      ["Family Activities", "Learning", "Games"],
    ),
    event(
      "new-year",
      "winter-holiday",
      "New Year Fresh Start",
      `${year}-12-28`,
      `${year + 1}-01-10`,
      ["Parenting Series", "Health Series", "Educational Series"],
      ["Routines", "Parenting", "Nutrition"],
    ),
    event(
      "weekend-pulse",
      "parenting-awareness",
      "Weekend Activities Pulse",
      `${year}-01-01`,
      `${year}-12-31`,
      ["Weekend Activities", "Family Challenges"],
      ["Family Activities", "Games", "Learning"],
    ),
    event(
      "milestones",
      "parenting-awareness",
      "Milestones & Birthdays",
      `${year}-01-01`,
      `${year}-12-31`,
      ["Educational Series", "Parenting Series"],
      ["Milestones", "Child Development", "Emotional Intelligence"],
    ),
  ];

  // Avoid exact id collisions with brain events.
  const seen = new Set(base.map((e) => e.id));
  return [...base, ...extra.filter((e) => !seen.has(e.id))];
}

export function activeIntelligenceSeasons(
  asOfDate: string,
  year = Number(asOfDate.slice(0, 4)),
): SeasonalEvent[] {
  const events = listIntelligenceSeasonalEvents(year);
  // Weekend pulse only on Sat/Sun
  const dow = new Date(`${asOfDate}T12:00:00.000Z`).getUTCDay();
  const active = activeSeasonalEvents(events, asOfDate, asOfDate).filter((e) => {
    if (e.id === "weekend-pulse") return dow === 0 || dow === 6;
    if (e.id === "milestones") return false; // soft always-on via scoring, not hard active
    return true;
  });
  // Soft-include milestones for scoring boost without dominating
  const milestones = events.find((e) => e.id === "milestones");
  if (milestones) active.push(milestones);
  return active;
}

export function seasonalBoostForTopic(
  topic: Topic,
  asOfDate: string,
): { score: number; events: SeasonalEvent[]; isSeasonal: boolean } {
  const active = activeIntelligenceSeasons(asOfDate);
  const matched = active.filter(
    (e) =>
      e.recommendedCategories.includes(topic.category) ||
      topic.keywords.some((k) =>
        e.name.toLowerCase().includes(k.toLowerCase()),
      ),
  );
  if (matched.length === 0) {
    return { score: 35, events: [], isSeasonal: false };
  }
  const score = Math.min(100, 55 + matched.length * 15);
  return { score, events: matched, isSeasonal: true };
}

export function weekdayPillar(dayOfWeek: string): {
  pillar: string;
  categories: TopicCategory[];
} {
  switch (dayOfWeek.toLowerCase()) {
    case "monday":
      return { pillar: "Learning", categories: ["Learning", "Brain Development"] };
    case "tuesday":
      return {
        pillar: "Health",
        categories: ["Nutrition", "Sleep", "Baby Care"],
      };
    case "wednesday":
      return { pillar: "Speech", categories: ["Speech", "Child Development"] };
    case "thursday":
      return { pillar: "Games", categories: ["Games", "Family Activities"] };
    case "friday":
      return { pillar: "Routine", categories: ["Routines", "Parenting"] };
    case "saturday":
      return {
        pillar: "Family Activity",
        categories: ["Family Activities", "Games", "Amy Astro"],
      };
    case "sunday":
    default:
      return {
        pillar: "Parent Insight",
        categories: ["Parenting", "Emotional Intelligence", "Daily Motivation"],
      };
  }
}

function event(
  id: string,
  kind: SeasonalEvent["kind"],
  name: string,
  startDate: string,
  endDate: string,
  recommendedSeries: SeasonalEvent["recommendedSeries"],
  recommendedCategories: TopicCategory[],
): SeasonalEvent {
  return {
    id,
    kind,
    name,
    startDate,
    endDate,
    recommendedSeries,
    recommendedCategories,
  };
}
