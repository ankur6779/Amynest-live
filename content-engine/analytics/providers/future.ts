import type {
  AnalyticsProviderHealth,
  ChannelPerformanceMetrics,
  CollectRequest,
  CollectResult,
  ShortsPerformanceMetrics,
  VideoPerformanceMetrics,
} from "../../types/analytics.js";
import type { AnalyticsProvider } from "./types.js";

/** Reserved extension slot for future analytics backends. */
export class FutureAnalyticsProvider implements AnalyticsProvider {
  readonly id = "future" as const;

  async health(): Promise<AnalyticsProviderHealth> {
    return {
      ok: false,
      message: "FutureAnalyticsProvider is a reserved extension slot",
      checkedAt: new Date().toISOString(),
    };
  }

  async collect(_request: CollectRequest): Promise<CollectResult> {
    throw new Error(
      "FutureAnalyticsProvider is not configured. Register a concrete analytics provider.",
    );
  }

  async video(_videoId: string): Promise<VideoPerformanceMetrics> {
    throw new Error("FutureAnalyticsProvider is not configured");
  }

  async channel(): Promise<ChannelPerformanceMetrics> {
    throw new Error("FutureAnalyticsProvider is not configured");
  }

  async shorts(): Promise<ShortsPerformanceMetrics> {
    throw new Error("FutureAnalyticsProvider is not configured");
  }
}
