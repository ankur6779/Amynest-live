import type {
  TrendProviderHealth,
  TrendSignal,
} from "../../types/campaign-plan.js";
import type { TrendProvider, TrendQuery } from "./types.js";

export interface YouTubeTrendsProviderOptions {
  apiKey?: string;
  apiKeyEnv?: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

/**
 * YouTube Data API mostPopular trends provider (fetch-only).
 */
export class YouTubeTrendsProvider implements TrendProvider {
  readonly id = "youtube-trends" as const;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(options: YouTubeTrendsProviderOptions = {}) {
    const env = options.apiKeyEnv ?? "YOUTUBE_API_KEY";
    this.apiKey = options.apiKey ?? process.env[env] ?? "";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.baseUrl = (options.baseUrl ?? "https://www.googleapis.com/youtube/v3").replace(
      /\/$/,
      "",
    );
  }

  async health(): Promise<TrendProviderHealth> {
    if (!this.apiKey) {
      return {
        ok: false,
        message: "YouTube API key missing",
        checkedAt: new Date().toISOString(),
      };
    }
    return {
      ok: true,
      message: "YouTube Trends credentials present",
      checkedAt: new Date().toISOString(),
    };
  }

  async fetchTrends(query: TrendQuery): Promise<TrendSignal[]> {
    if (!this.apiKey) return [];
    const url = new URL(`${this.baseUrl}/videos`);
    url.searchParams.set("part", "snippet,statistics");
    url.searchParams.set("chart", "mostPopular");
    url.searchParams.set("regionCode", query.region === "IN" ? "IN" : "US");
    url.searchParams.set("maxResults", String(query.limit ?? 10));
    url.searchParams.set("key", this.apiKey);

    const response = await this.fetchImpl(url);
    if (!response.ok) {
      throw new Error(`YouTube Trends request failed (${response.status})`);
    }
    const payload = (await response.json()) as {
      items?: Array<{
        snippet?: { title?: string; categoryId?: string };
        statistics?: { viewCount?: string };
      }>;
    };

    return (payload.items ?? []).map((item, index) => ({
      keyword: item.snippet?.title ?? `yt-trend-${index + 1}`,
      score: Math.min(
        100,
        Math.round(Number(item.statistics?.viewCount ?? 0) / 100_000) || 50 - index,
      ),
      region: query.region,
      source: this.id,
      relatedCategories: [],
    }));
  }
}
