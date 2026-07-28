import type { TopicCategory, VideoStyle } from "./index.js";
import type { AnalyticsReport, OptimizationSignal } from "./analytics.js";

export const CAMPAIGN_PLAN_VERSION = "9.0.0";

export type TrendProviderId = "mock" | "google-trends" | "youtube-trends" | "future";

export type CampaignSeriesKind =
  | "Parenting Series"
  | "Astro Series"
  | "Speech Series"
  | "Health Series"
  | "Weekend Activities"
  | "Family Challenges"
  | "Feature Releases"
  | "Premium Campaigns"
  | "Seasonal Campaigns"
  | "Educational Series";

export type ExperimentVariable =
  | "title"
  | "hook"
  | "description"
  | "cta"
  | "length"
  | "publish-time"
  | "hashtags";

export type SeasonalEventKind =
  | "festival"
  | "school-calendar"
  | "summer-vacation"
  | "winter-holiday"
  | "exam-season"
  | "national-event"
  | "parenting-awareness";

export interface BrainEngineSettings {
  campaignPlanningEnabled: boolean;
  optimizationEnabled: boolean;
  trendProvider: TrendProviderId;
  seasonalCalendar: string;
  abTestingEnabled: boolean;
  predictionEnabled: boolean;
  learningWindowDays: number;
  confidenceThreshold: number;
}

export interface PerformancePrediction {
  expectedViews: number;
  expectedRetention: number;
  expectedCtr: number;
  expectedEngagement: number;
  confidence: number;
}

export interface RankedItem<T extends string = string> {
  id: T;
  label: string;
  score: number;
  confidence: number;
  rationale: string;
}

export interface ContentMemorySnapshot {
  publishedTopicIds: string[];
  winningHooks: string[];
  winningCtas: string[];
  winningPublishHours: number[];
  winningVideoStyles: VideoStyle[];
  avoidedTopicIds: string[];
  updatedAt: string;
}

export interface TrendSignal {
  keyword: string;
  score: number;
  region: string;
  source: TrendProviderId;
  relatedCategories: TopicCategory[];
}

export interface TrendProviderHealth {
  ok: boolean;
  message?: string;
  checkedAt: string;
}

export interface SeasonalEvent {
  id: string;
  kind: SeasonalEventKind;
  name: string;
  startDate: string;
  endDate: string;
  recommendedSeries: CampaignSeriesKind[];
  recommendedCategories: TopicCategory[];
}

export interface ExperimentVariant {
  id: string;
  label: string;
  value: string | number;
}

export interface ExperimentDefinition {
  id: string;
  variable: ExperimentVariable;
  variants: ExperimentVariant[];
  startedAt: string;
  status: "running" | "completed";
  winnerVariantId?: string;
}

export interface ExperimentResult {
  experimentId: string;
  variable: ExperimentVariable;
  winnerVariantId: string;
  winnerValue: string | number;
  lift: number;
  confidence: number;
}

export interface OptimizationDecision {
  topicSelection: {
    preferCategories: TopicCategory[];
    reduceCategories: TopicCategory[];
    preferTopicIds: string[];
    avoidTopicIds: string[];
  };
  videoDurationSeconds: 15 | 20 | 30;
  openingHookStyle: "question" | "bold-claim" | "story";
  ctaStyle: "soft" | "direct" | "app-demo";
  publishHour: number;
  videoStyle: VideoStyle;
  scenePace: "calm" | "balanced" | "brisk";
  categoryRotationBoost: TopicCategory[];
  signals: OptimizationSignal[];
}

export interface BrainRecommendation {
  id: string;
  priority: number;
  message: string;
  rationale: string;
  category?: TopicCategory;
  publishHour?: number;
  durationSeconds?: number;
}

export interface CampaignSlot {
  date: string;
  dayOfWeek: string;
  publishAt: string;
  series: CampaignSeriesKind;
  priorityTopicId: string;
  topicTitle: string;
  category: TopicCategory;
  recommendedHook: string;
  recommendedCta: string;
  videoStyle: VideoStyle;
  durationSeconds: 15 | 20 | 30;
  predicted: PerformancePrediction;
}

export interface CampaignSeriesPlan {
  kind: CampaignSeriesKind;
  objective: string;
  categories: TopicCategory[];
  slotsPerWeek: number;
  priority: number;
}

export interface CampaignPlan {
  id: string;
  version: string;
  createdAt: string;
  horizonDays: number;
  startDate: string;
  endDate: string;
  series: CampaignSeriesPlan[];
  schedule: CampaignSlot[];
  priorityTopics: RankedItem[];
  recommendedHooks: string[];
  recommendedCtas: string[];
  publishingCalendar: Array<{ date: string; slotCount: number; series: CampaignSeriesKind[] }>;
  optimization: OptimizationDecision;
  recommendations: BrainRecommendation[];
  experiments: ExperimentDefinition[];
  experimentResults: ExperimentResult[];
  rankings: {
    topics: RankedItem[];
    categories: RankedItem[];
    hooks: RankedItem[];
    ctas: RankedItem[];
    campaigns: RankedItem[];
    publishingSlots: RankedItem[];
  };
  seasonalEvents: SeasonalEvent[];
  trendSignals: TrendSignal[];
  memory: ContentMemorySnapshot;
  expectedPerformance: PerformancePrediction;
  telemetry: BrainTelemetry;
}

export interface BrainTelemetry {
  predictionAccuracy: number;
  optimizationGains: number;
  campaignSuccess: number;
  experimentSuccess: number;
  recommendationAcceptance: number;
  provider: TrendProviderId;
  planningDurationMs: number;
}

export interface BrainInput {
  analytics: AnalyticsReport;
  /** Optional ISO start date for the 30-day horizon (defaults to tomorrow). */
  startDate?: string;
  horizonDays?: number;
  /** Previously published topic ids for memory/dedupe. */
  publishedTopicIds?: string[];
}

export type CampaignExportFormat = "json" | "yaml" | "campaign-plan-v1";

export interface CampaignExportResult {
  format: CampaignExportFormat;
  content: string;
  contentType: string;
}
