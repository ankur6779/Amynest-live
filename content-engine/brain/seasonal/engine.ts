import type {
  CampaignSeriesKind,
  SeasonalEvent,
} from "../../types/campaign-plan.js";
import type { TopicCategory } from "../../types/index.js";

/** Built-in seasonal calendar with parenting-aware events (global + regional). */
export function listSeasonalEvents(
  calendar: string,
  year: number,
): SeasonalEvent[] {
  const region = calendar.toUpperCase();
  const events: SeasonalEvent[] = [
    event(
      "summer-vacation",
      "summer-vacation",
      "Summer Vacation",
      `${year}-05-01`,
      `${year}-06-15`,
      ["Weekend Activities", "Family Challenges", "Educational Series"],
      ["Family Activities", "Learning", "Routines"],
    ),
    event(
      "exam-season",
      "exam-season",
      "Exam Season",
      `${year}-02-15`,
      `${year}-03-31`,
      ["Educational Series", "Speech Series", "Health Series"],
      ["Learning", "Speech", "Emotional Intelligence"],
    ),
    event(
      "winter-holiday",
      "winter-holiday",
      "Winter Holidays",
      `${year}-12-15`,
      `${year}-01-05`,
      ["Family Challenges", "Seasonal Campaigns", "Weekend Activities"],
      ["Family Activities", "Parenting", "Routines"],
    ),
    event(
      "school-reopen",
      "school-calendar",
      "School Reopening",
      `${year}-06-01`,
      `${year}-06-20`,
      ["Educational Series", "Parenting Series", "Speech Series"],
      ["Routines", "Learning", "Parenting"],
    ),
    event(
      "parenting-awareness",
      "parenting-awareness",
      "Parenting Awareness Week",
      `${year}-07-01`,
      `${year}-07-07`,
      ["Parenting Series", "Speech Series", "Health Series"],
      ["Parenting", "Speech", "Child Development"],
    ),
  ];

  if (region === "IN") {
    events.push(
      event(
        "diwali",
        "festival",
        "Diwali",
        `${year}-10-20`,
        `${year}-11-05`,
        ["Seasonal Campaigns", "Family Challenges", "Astro Series"],
        ["Family Activities", "Amy Astro", "Parenting"],
      ),
      event(
        "holi",
        "festival",
        "Holi",
        `${year}-03-10`,
        `${year}-03-18`,
        ["Seasonal Campaigns", "Weekend Activities"],
        ["Family Activities", "Parenting"],
      ),
      event(
        "independence-day",
        "national-event",
        "Independence Day",
        `${year}-08-12`,
        `${year}-08-16`,
        ["Seasonal Campaigns", "Educational Series"],
        ["Learning", "Family Activities"],
      ),
    );
  }

  return events;
}

export function activeSeasonalEvents(
  events: readonly SeasonalEvent[],
  startDate: string,
  endDate: string,
): SeasonalEvent[] {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  return events.filter((event) => {
    const eventStart = Date.parse(`${event.startDate}T00:00:00.000Z`);
    const eventEnd = Date.parse(`${event.endDate}T00:00:00.000Z`);
    return eventStart <= end && eventEnd >= start;
  });
}

function event(
  id: string,
  kind: SeasonalEvent["kind"],
  name: string,
  startDate: string,
  endDate: string,
  recommendedSeries: CampaignSeriesKind[],
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
