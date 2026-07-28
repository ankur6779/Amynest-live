import type {
  AnalyticsProviderHealth,
  AnalyticsProviderId,
  ChannelPerformanceMetrics,
  CollectRequest,
  CollectResult,
  ShortsPerformanceMetrics,
  VideoPerformanceMetrics,
} from "../../types/analytics.js";

/**
 * Provider-agnostic analytics contract.
 * Orchestration never hardcodes vendor SDKs — only this interface.
 */
export interface AnalyticsProvider {
  readonly id: AnalyticsProviderId;
  health(): Promise<AnalyticsProviderHealth>;
  collect(request: CollectRequest): Promise<CollectResult>;
  video(videoId: string): Promise<VideoPerformanceMetrics>;
  channel(): Promise<ChannelPerformanceMetrics>;
  shorts(): Promise<ShortsPerformanceMetrics>;
}
