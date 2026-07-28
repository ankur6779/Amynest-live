import type {
  AnalyticsProviderHealth,
  ChannelPerformanceMetrics,
  CollectRequest,
  CollectResult,
  ShortsPerformanceMetrics,
  VideoPerformanceMetrics,
} from "../../types/analytics.js";
import { resolveYouTubeAccessToken } from "../../publishing/youtube/oauth.js";
import type { AnalyticsProvider } from "./types.js";

export interface YouTubeAnalyticsProviderOptions {
  accessToken?: string;
  accessTokenEnv?: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  autoRefresh?: boolean;
}

/**
 * YouTube Analytics API provider (fetch-only, no vendor SDK).
 * Supports OAuth refresh via the same YouTube OAuth credentials used for publishing.
 */
export class YouTubeAnalyticsProvider implements AnalyticsProvider {
  readonly id = "youtube" as const;
  private accessToken: string;
  private readonly apiBaseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly autoRefresh: boolean;
  private refreshPromise?: Promise<string>;

  constructor(options: YouTubeAnalyticsProviderOptions = {}) {
    const envName = options.accessTokenEnv ?? "YOUTUBE_ACCESS_TOKEN";
    this.accessToken =
      options.accessToken ??
      process.env[envName] ??
      process.env.ANALYTICS_ACCESS_TOKEN ??
      "";
    this.apiBaseUrl = (
      options.apiBaseUrl ?? "https://youtubeanalytics.googleapis.com/v2"
    ).replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.autoRefresh = options.autoRefresh !== false;
  }

  async health(): Promise<AnalyticsProviderHealth> {
    try {
      await this.ensureAccessToken();
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        checkedAt: new Date().toISOString(),
      };
    }
    if (!this.accessToken) {
      return {
        ok: false,
        message: "YouTube Analytics access token missing",
        checkedAt: new Date().toISOString(),
      };
    }
    try {
      const response = await this.fetchImpl(`${this.apiBaseUrl}/reports?ids=channel==MINE&metrics=views&startDate=2020-01-01&endDate=2020-01-02`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      return {
        ok: response.ok,
        message: response.ok
          ? "YouTube Analytics reachable"
          : `YouTube Analytics health failed (${response.status})`,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async collect(request: CollectRequest): Promise<CollectResult> {
    await this.ensureAccessToken();
    this.assertAuth();
    const started = Date.now();
    const videos: VideoPerformanceMetrics[] = [];
    const missingMetrics: string[] = [];
    let apiLatencyMs = 0;

    for (const videoId of request.videoIds) {
      const callStarted = Date.now();
      try {
        videos.push(
          await this.fetchVideoMetrics(videoId, request.startDate, request.endDate),
        );
      } catch (error) {
        missingMetrics.push(
          `${videoId}:${error instanceof Error ? error.message : String(error)}`,
        );
      }
      apiLatencyMs += Date.now() - callStarted;
    }

    const channel = await this.channel();
    const shorts = await this.shorts();
    return {
      videos,
      channel,
      shorts,
      apiLatencyMs,
      collectionDurationMs: Date.now() - started,
      missingMetrics,
    };
  }

  async video(videoId: string): Promise<VideoPerformanceMetrics> {
    this.assertAuth();
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 28 * 86_400_000).toISOString().slice(0, 10);
    return this.fetchVideoMetrics(videoId, start, end);
  }

  async channel(): Promise<ChannelPerformanceMetrics> {
    this.assertAuth();
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 28 * 86_400_000).toISOString().slice(0, 10);
    const rows = await this.query({
      ids: "channel==MINE",
      metrics: "views,estimatedMinutesWatched,averageViewDuration,subscribersGained",
      startDate: start,
      endDate: end,
    });
    const row = rows[0] ?? [0, 0, 0, 0];
    return {
      collectedAt: new Date().toISOString(),
      subscribers: Number(row[3] ?? 0),
      views: Number(row[0] ?? 0),
      watchTimeMinutes: Number(row[1] ?? 0),
      averageViewDurationSeconds: Number(row[2] ?? 0),
      estimatedRevenue: 0,
      shortsViews: Number(row[0] ?? 0),
      videosPublished: 0,
    };
  }

  async shorts(): Promise<ShortsPerformanceMetrics> {
    const channel = await this.channel();
    return {
      collectedAt: new Date().toISOString(),
      views: channel.shortsViews,
      averageViewDurationSeconds: channel.averageViewDurationSeconds,
      swipeAwayRate: 0,
      engagedViews: Math.round(channel.views * 0.5),
    };
  }

  private async fetchVideoMetrics(
    videoId: string,
    startDate: string,
    endDate: string,
  ): Promise<VideoPerformanceMetrics> {
    const rows = await this.query({
      ids: "channel==MINE",
      metrics:
        "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,annotationClickThroughRate,likes,comments,shares,subscribersGained",
      dimensions: "video",
      filters: `video==${videoId}`,
      startDate,
      endDate,
    });
    const row = rows[0] ?? [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const views = Number(row[0] ?? 0);
    return {
      videoId,
      collectedAt: new Date().toISOString(),
      views,
      watchTimeMinutes: Number(row[1] ?? 0),
      averageViewDurationSeconds: Number(row[2] ?? 0),
      averagePercentageViewed: Number(row[3] ?? 0),
      retention: Number(row[3] ?? 0) / 100,
      ctr: Number(row[4] ?? 0),
      subscribersGained: Number(row[8] ?? 0),
      likes: Number(row[5] ?? 0),
      comments: Number(row[6] ?? 0),
      shares: Number(row[7] ?? 0),
      trafficSources: {
        shorts_feed: 0,
        browse: 0,
        search: 0,
        suggested: 0,
        external: 0,
        playlist: 0,
        other: 1,
      },
      returningViewers: 0,
      newViewers: views,
      geography: {},
      deviceType: {
        mobile: 0,
        tablet: 0,
        tv: 0,
        desktop: 0,
        unknown: views,
      },
      missingMetrics: [
        "trafficSources",
        "returningViewers",
        "geography",
        "deviceType",
      ],
    };
  }

  private async query(params: Record<string, string>): Promise<number[][]> {
    const url = new URL(`${this.apiBaseUrl}/reports`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const response = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`YouTube Analytics query failed (${response.status})`);
    }
    const payload = (await response.json()) as { rows?: number[][] };
    return payload.rows ?? [];
  }

  private async ensureAccessToken(): Promise<void> {
    if (this.accessToken) return;
    if (!this.autoRefresh) return;
    if (!this.refreshPromise) {
      this.refreshPromise = resolveYouTubeAccessToken({
        fetchImpl: this.fetchImpl,
        persistToEnv: true,
      }).finally(() => {
        this.refreshPromise = undefined;
      });
    }
    this.accessToken = await this.refreshPromise;
  }

  private assertAuth(): void {
    if (!this.accessToken) {
      throw new Error("YouTube Analytics access token missing");
    }
  }
}
