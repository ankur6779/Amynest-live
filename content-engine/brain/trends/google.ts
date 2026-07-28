import type {
  TrendProviderHealth,
  TrendSignal,
} from "../../types/campaign-plan.js";
import type { TrendProvider, TrendQuery } from "./types.js";

export interface GoogleTrendsProviderOptions {
  apiKey?: string;
  apiKeyEnv?: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

/**
 * Google Trends provider (fetch-only).
 * Without an API key, health() is unavailable and fetchTrends falls back to empty.
 */
export class GoogleTrendsProvider implements TrendProvider {
  readonly id = "google-trends" as const;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(options: GoogleTrendsProviderOptions = {}) {
    const env = options.apiKeyEnv ?? "GOOGLE_TRENDS_API_KEY";
    this.apiKey = options.apiKey ?? process.env[env] ?? "";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.baseUrl = (options.baseUrl ?? "https://trends.google.com/trends/api").replace(
      /\/$/,
      "",
    );
  }

  async health(): Promise<TrendProviderHealth> {
    if (!this.apiKey) {
      return {
        ok: false,
        message: "Google Trends API key missing",
        checkedAt: new Date().toISOString(),
      };
    }
    return {
      ok: true,
      message: "Google Trends credentials present",
      checkedAt: new Date().toISOString(),
    };
  }

  async fetchTrends(query: TrendQuery): Promise<TrendSignal[]> {
    if (!this.apiKey) return [];
    const url = `${this.baseUrl}/dailytrends?geo=${encodeURIComponent(query.region)}&hl=en-US`;
    const response = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!response.ok) {
      throw new Error(`Google Trends request failed (${response.status})`);
    }
    const payload = (await response.json()) as {
      default?: { trendingSearchesDays?: Array<{ trendingSearches?: Array<{ title?: { query?: string }; formattedTraffic?: string }> }> };
    };
    const searches =
      payload.default?.trendingSearchesDays?.flatMap((d) => d.trendingSearches ?? []) ??
      [];
    return searches.slice(0, query.limit ?? 10).map((item, index) => ({
      keyword: item.title?.query ?? `trend-${index + 1}`,
      score: Math.max(10, 100 - index * 7),
      region: query.region,
      source: this.id,
      relatedCategories: [],
    }));
  }
}
