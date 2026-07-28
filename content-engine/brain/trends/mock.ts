import type {
  TrendProviderHealth,
  TrendSignal,
} from "../../types/campaign-plan.js";
import type { TrendProvider, TrendQuery } from "./types.js";

export class MockTrendProvider implements TrendProvider {
  readonly id = "mock" as const;

  async health(): Promise<TrendProviderHealth> {
    return {
      ok: true,
      message: "MockTrendProvider ready",
      checkedAt: new Date().toISOString(),
    };
  }

  async fetchTrends(query: TrendQuery): Promise<TrendSignal[]> {
    const base: TrendSignal[] = [
      {
        keyword: "gentle parenting",
        score: 82,
        region: query.region,
        source: this.id,
        relatedCategories: ["Parenting", "Emotional Intelligence"],
      },
      {
        keyword: "amy astro kids",
        score: 78,
        region: query.region,
        source: this.id,
        relatedCategories: ["Amy Astro", "Learning"],
      },
      {
        keyword: "speech delay tips",
        score: 74,
        region: query.region,
        source: this.id,
        relatedCategories: ["Speech", "Child Development"],
      },
      {
        keyword: "weekend family activities",
        score: 69,
        region: query.region,
        source: this.id,
        relatedCategories: ["Family Activities", "Routines"],
      },
      {
        keyword: "kids screen time",
        score: 66,
        region: query.region,
        source: this.id,
        relatedCategories: ["Screen Time", "Parenting"],
      },
    ];

    const filtered = query.keywords?.length
      ? base.filter((t) =>
          query.keywords!.some((k) =>
            t.keyword.toLowerCase().includes(k.toLowerCase()),
          ),
        )
      : base;

    return filtered.slice(0, query.limit ?? 10);
  }
}
