import type {
  CampaignSeriesKind,
  CampaignSeriesPlan,
  SeasonalEvent,
  TrendSignal,
} from "../../types/campaign-plan.js";
import type { TopicCategory } from "../../types/index.js";
import type { OptimizationDecision } from "../../types/campaign-plan.js";

const BASE_SERIES: CampaignSeriesPlan[] = [
  {
    kind: "Parenting Series",
    objective: "Build trust with practical parenting tips",
    categories: ["Parenting", "Emotional Intelligence", "Routines"],
    slotsPerWeek: 3,
    priority: 90,
  },
  {
    kind: "Astro Series",
    objective: "Grow Amy Astro discovery and engagement",
    categories: ["Amy Astro", "Learning"],
    slotsPerWeek: 2,
    priority: 85,
  },
  {
    kind: "Speech Series",
    objective: "Support speech development journeys",
    categories: ["Speech", "Child Development"],
    slotsPerWeek: 1,
    priority: 80,
  },
  {
    kind: "Health Series",
    objective: "Share safe wellness and care guidance",
    categories: ["Baby Care", "Nutrition", "Sleep"],
    slotsPerWeek: 1,
    priority: 70,
  },
  {
    kind: "Weekend Activities",
    objective: "Drive weekend family engagement",
    categories: ["Family Activities", "Games"],
    slotsPerWeek: 1,
    priority: 75,
  },
  {
    kind: "Family Challenges",
    objective: "Create shareable challenge content",
    categories: ["Family Activities", "Routines"],
    slotsPerWeek: 1,
    priority: 68,
  },
  {
    kind: "Feature Releases",
    objective: "Highlight AmyNest product moments",
    categories: ["Amy Astro", "Learning"],
    slotsPerWeek: 1,
    priority: 72,
  },
  {
    kind: "Premium Campaigns",
    objective: "Convert curiosity into premium trials",
    categories: ["Parenting", "Amy Astro"],
    slotsPerWeek: 1,
    priority: 65,
  },
  {
    kind: "Seasonal Campaigns",
    objective: "Ride seasonal and festival moments",
    categories: ["Family Activities", "Parenting"],
    slotsPerWeek: 1,
    priority: 78,
  },
  {
    kind: "Educational Series",
    objective: "Deliver evergreen learning value",
    categories: ["Learning", "Brain Development", "Milestones"],
    slotsPerWeek: 1,
    priority: 74,
  },
];

/** Compose weekly/monthly campaign series from optimization + seasonality + trends. */
export function planCampaignSeries(input: {
  optimization: OptimizationDecision;
  seasonalEvents: SeasonalEvent[];
  trendSignals: TrendSignal[];
}): CampaignSeriesPlan[] {
  const preferred = new Set(input.optimization.topicSelection.preferCategories);
  const seasonalKinds = new Set(
    input.seasonalEvents.flatMap((e) => e.recommendedSeries),
  );
  const trendCategories = new Set(
    input.trendSignals.flatMap((t) => t.relatedCategories),
  );

  return BASE_SERIES.map((series) => {
    let priority = series.priority;
    if (series.categories.some((c) => preferred.has(c))) priority += 8;
    if (seasonalKinds.has(series.kind)) priority += 10;
    if (series.categories.some((c) => trendCategories.has(c))) priority += 6;
    if (
      series.categories.some((c) =>
        input.optimization.topicSelection.reduceCategories.includes(c),
      )
    ) {
      priority -= 12;
    }
    return {
      ...series,
      priority: Math.max(10, Math.min(100, priority)),
      slotsPerWeek: adjustSlots(series, preferred, seasonalKinds),
    };
  }).sort((a, b) => b.priority - a.priority);
}

function adjustSlots(
  series: CampaignSeriesPlan,
  preferred: Set<TopicCategory>,
  seasonalKinds: Set<CampaignSeriesKind>,
): number {
  let slots = series.slotsPerWeek;
  if (series.categories.some((c) => preferred.has(c))) slots += 1;
  if (seasonalKinds.has(series.kind)) slots += 1;
  if (series.kind === "Astro Series" && preferred.has("Amy Astro")) slots += 1;
  return Math.min(5, slots);
}
