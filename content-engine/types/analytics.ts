import type { TopicCategory, VideoStyle } from "./index.js";
import type { ContentPackage } from "./content-package.js";
import type { PublishedVideo } from "./published-video.js";

export const ANALYTICS_REPORT_VERSION = "8.0.0";

export type AnalyticsProviderId = "mock" | "youtube" | "future";

export type ReportSchedule = "daily" | "weekly" | "monthly";

export type TrafficSource =
  | "shorts_feed"
  | "browse"
  | "search"
  | "suggested"
  | "external"
  | "playlist"
  | "other";

export type DeviceType = "mobile" | "tablet" | "tv" | "desktop" | "unknown";

export interface AnalyticsEngineSettings {
  analyticsProvider: AnalyticsProviderId;
  reportSchedule: ReportSchedule;
  minimumSampleSize: number;
  learningRetentionDays: number;
  optimizationEnabled: boolean;
}

export interface VideoPerformanceMetrics {
  videoId: string;
  collectedAt: string;
  views: number;
  watchTimeMinutes: number;
  averageViewDurationSeconds: number;
  averagePercentageViewed: number;
  retention: number;
  ctr: number;
  subscribersGained: number;
  likes: number;
  comments: number;
  shares: number;
  trafficSources: Record<TrafficSource, number>;
  returningViewers: number;
  newViewers: number;
  geography: Record<string, number>;
  deviceType: Record<DeviceType, number>;
  missingMetrics: string[];
}

export interface ChannelPerformanceMetrics {
  collectedAt: string;
  subscribers: number;
  views: number;
  watchTimeMinutes: number;
  averageViewDurationSeconds: number;
  estimatedRevenue: number;
  shortsViews: number;
  videosPublished: number;
}

export interface ShortsPerformanceMetrics {
  collectedAt: string;
  views: number;
  averageViewDurationSeconds: number;
  swipeAwayRate: number;
  engagedViews: number;
}

export interface AnalyticsProviderHealth {
  ok: boolean;
  message?: string;
  checkedAt: string;
}

export interface CollectRequest {
  videoIds: string[];
  startDate: string;
  endDate: string;
}

export interface CollectResult {
  videos: VideoPerformanceMetrics[];
  channel: ChannelPerformanceMetrics;
  shorts: ShortsPerformanceMetrics;
  apiLatencyMs: number;
  collectionDurationMs: number;
  missingMetrics: string[];
}

export interface TopicScoreBreakdown {
  performance: number;
  retention: number;
  engagement: number;
  growth: number;
  freshness: number;
  overall: number;
}

export interface TopicScore {
  topicId: string;
  topicTitle: string;
  category: TopicCategory;
  sampleSize: number;
  score: TopicScoreBreakdown;
  updatedAt: string;
}

export interface ContentScoreBreakdown {
  hooks: number;
  cta: number;
  titles: number;
  descriptions: number;
  hashtags: number;
  videoLength: number;
  scenePace: number;
  overall: number;
}

export interface ContentScore {
  videoId: string;
  topicId: string;
  score: ContentScoreBreakdown;
  updatedAt: string;
}

export type RecommendationKind =
  | "prefer-category"
  | "reduce-duration"
  | "improve-hook"
  | "increase-cta"
  | "prefer-app-demo"
  | "prefer-publish-time"
  | "retire-topic"
  | "prefer-video-style";

export interface GrowthRecommendation {
  id: string;
  kind: RecommendationKind;
  priority: number;
  message: string;
  rationale: string;
  category?: TopicCategory;
  topicId?: string;
  videoStyle?: VideoStyle;
  publishHour?: number;
}

export interface CategoryTrend {
  category: TopicCategory;
  direction: "rising" | "stable" | "declining";
  scoreDelta: number;
  sampleSize: number;
}

export interface TopicTrend {
  topicId: string;
  direction: "rising" | "stable" | "declining";
  scoreDelta: number;
}

export interface SeasonalSpike {
  category: TopicCategory;
  month: number;
  lift: number;
}

export interface PublishTimeEffectiveness {
  hour: number;
  averageViews: number;
  averageCtr: number;
  sampleSize: number;
}

export interface TrendReport {
  highPerformingCategories: CategoryTrend[];
  decliningTopics: TopicTrend[];
  seasonalSpikes: SeasonalSpike[];
  publishingTimeEffectiveness: PublishTimeEffectiveness[];
}

export interface LearningRecord {
  topicId: string;
  category: TopicCategory;
  videoStyle: VideoStyle;
  publishHour: number;
  performanceScore: number;
  retentionScore: number;
  engagementScore: number;
  observedAt: string;
  videoId: string;
}

export interface AudiencePreference {
  key: string;
  value: string;
  weight: number;
  updatedAt: string;
}

export interface LearningStoreSnapshot {
  topicPerformance: LearningRecord[];
  categoryTrends: CategoryTrend[];
  publishingTimes: PublishTimeEffectiveness[];
  videoStyles: Array<{ style: VideoStyle; averageScore: number; sampleSize: number }>;
  audiencePreferences: AudiencePreference[];
  updatedAt: string;
}

export interface OptimizationSignal {
  id: string;
  signal: string;
  weight: number;
  appliesTo: "topic-selection" | "content-generation" | "scheduling";
  payload: Record<string, string | number | boolean>;
}

export interface VideoAnalyticsSummary {
  videoId: string;
  title: string;
  topicId: string;
  metrics: VideoPerformanceMetrics;
  topicScore: number;
  contentScore: number;
}

export interface ChannelAnalyticsSummary {
  metrics: ChannelPerformanceMetrics;
  shorts: ShortsPerformanceMetrics;
  topVideoIds: string[];
  worstVideoIds: string[];
  growthSummary: string;
}

export interface PeriodReport {
  schedule: ReportSchedule;
  periodStart: string;
  periodEnd: string;
  topVideos: VideoAnalyticsSummary[];
  worstVideos: VideoAnalyticsSummary[];
  growthSummary: string;
  averageViews: number;
  averageCtr: number;
  averageRetention: number;
}

export interface AnalyticsTelemetry {
  apiLatencyMs: number;
  collectionDurationMs: number;
  missingMetrics: number;
  errors: string[];
  provider: AnalyticsProviderId;
  videosAnalyzed: number;
}

export interface AnalyticsReport {
  id: string;
  version: string;
  createdAt: string;
  schedule: ReportSchedule;
  channelSummary: ChannelAnalyticsSummary;
  videoSummaries: VideoAnalyticsSummary[];
  topicScores: TopicScore[];
  contentScores: ContentScore[];
  recommendations: GrowthRecommendation[];
  learningUpdates: LearningStoreSnapshot;
  trends: TrendReport;
  periodReport: PeriodReport;
  optimizationSignals: OptimizationSignal[];
  telemetry: AnalyticsTelemetry;
}

export interface AnalyticsInput {
  videos: PublishedVideo[];
  /** Map published videoId → topicId for scoring and learning. */
  videoTopicIds?: Record<string, string>;
  /** Optional content packages keyed by topic id for content scoring. */
  contentByTopicId?: Record<string, ContentPackage>;
  /** Optional topic metadata keyed by topic id. */
  topicsById?: Record<
    string,
    { title: string; category: TopicCategory; videoStyle: VideoStyle }
  >;
  startDate?: string;
  endDate?: string;
  schedule?: ReportSchedule;
}

export type AnalyticsExportFormat = "json" | "yaml" | "analytics-report-v1";

export interface AnalyticsExportResult {
  format: AnalyticsExportFormat;
  content: string;
  contentType: string;
}
