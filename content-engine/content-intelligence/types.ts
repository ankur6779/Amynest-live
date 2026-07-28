/**
 * Content Intelligence & Campaign Manager types.
 * Additive layer ABOVE the production pipeline — no new WorkflowPhase.
 */

import type { Topic, TopicCategory } from "../types/index.js";
import type {
  CampaignPlan,
  CampaignSeriesKind,
  PerformancePrediction,
  SeasonalEvent,
} from "../types/campaign-plan.js";

export const CONTENT_INTELLIGENCE_VERSION = "1.0.0";

/** Named editorial series the audience should recognize. */
export type ContentSeriesId =
  | "study-zone-mastery"
  | "healthy-habits"
  | "speech-journey"
  | "routine-reset"
  | "weekend-learning"
  | "brain-boost"
  | "astro-stories"
  | "amy-coach-tips"
  | "audio-adventures"
  | "premium-features";

export interface ContentSeriesDefinition {
  id: ContentSeriesId;
  label: string;
  objective: string;
  categories: TopicCategory[];
  keywords: string[];
  campaignSeries: CampaignSeriesKind[];
}

export type PublishPlatform =
  | "youtube-short"
  | "instagram-reel"
  | "facebook-reel"
  | "pinterest"
  | "blog"
  | "email"
  | "community";

/** Permanent memory record for every generated / published video. */
export interface VideoMemoryRecord {
  videoId: string;
  topicId: string;
  topicTitle: string;
  feature: string;
  hook: string;
  emotion: string;
  characters: string[];
  durationSeconds: number;
  publishDate: string | null;
  platform: PublishPlatform;
  cta: string;
  seriesId: ContentSeriesId;
  predicted: PerformancePrediction | null;
  actual: {
    views?: number;
    retention?: number;
    ctr?: number;
    engagement?: number;
  } | null;
  createdAt: string;
}

export interface CampaignScoreBreakdown {
  novelty: number;
  educationalValue: number;
  parentValue: number;
  emotionalImpact: number;
  brandValue: number;
  retentionPrediction: number;
  ctrPrediction: number;
  seasonalRelevance: number;
  seriesBalance: number;
  overall: number;
}

export interface TopicGateResult {
  ok: boolean;
  topicId: string;
  topicTitle: string;
  seriesId: ContentSeriesId;
  scores: CampaignScoreBreakdown;
  reasons: string[];
  rejectCodes: Array<
    | "duplicate"
    | "saturated"
    | "weak-score"
    | "series-imbalance"
    | "off-season"
    | "audience-mismatch"
    | "underperform-risk"
    | "ok"
  >;
  shouldPublish: boolean;
  isSeasonal: boolean;
  isSaturated: boolean;
  likelyOutperform: boolean;
  predicted: PerformancePrediction;
}

export type CampaignModeId =
  | "7-day-reading-challenge"
  | "30-day-routine-reset"
  | "healthy-habit-week"
  | "confidence-building-month"
  | "back-to-school-series"
  | "none";

export interface CampaignModeDefinition {
  id: CampaignModeId;
  label: string;
  durationDays: number;
  seriesIds: ContentSeriesId[];
  preferCategories: TopicCategory[];
  connectedArc: string[];
  objective: string;
}

export interface EditorialDayPlan {
  date: string;
  dayOfWeek: string;
  preferredPillar: string;
  preferredCategories: TopicCategory[];
  preferredSeries: ContentSeriesId[];
  topicId?: string;
  topicTitle?: string;
  seriesId?: ContentSeriesId;
  campaignMode?: CampaignModeId;
  score?: number;
  seasonalEvents: string[];
}

export interface EditorialCalendar90d {
  id: string;
  version: typeof CONTENT_INTELLIGENCE_VERSION;
  createdAt: string;
  startDate: string;
  endDate: string;
  days: EditorialDayPlan[];
  categoryBalance: Record<string, number>;
  seriesBalance: Record<string, number>;
  campaignMode: CampaignModeId;
  /** Underlying brain campaign plan when available. */
  brainPlan?: CampaignPlan;
}

export interface DerivativePlan {
  sourceId: string;
  sourceMessage: string;
  derivatives: Array<{
    platform: PublishPlatform;
    formatHint: string;
    title: string;
    body: string;
    cta: string;
    hashtags: string[];
  }>;
}

export interface PublishingStrategy {
  topicId: string;
  bestPublishDay: string;
  bestPublishTime: string;
  recommendedHashtags: string[];
  suggestedTitle: string;
  suggestedDescription: string;
  thumbnailConcept: string;
  primaryAudience: string;
  seriesId: ContentSeriesId;
}

export interface IntelligenceDashboard {
  id: string;
  version: typeof CONTENT_INTELLIGENCE_VERSION;
  createdAt: string;
  upcomingVideos: EditorialDayPlan[];
  seriesBalance: Record<string, number>;
  categoryDistribution: Record<string, number>;
  campaignProgress: {
    mode: CampaignModeId;
    completedSlots: number;
    remainingSlots: number;
    arc: string[];
  };
  contentGaps: string[];
  repeatedThemes: string[];
  topOpportunities: Array<{
    topicId: string;
    title: string;
    score: number;
    reason: string;
  }>;
  memorySize: number;
  seasonalFocus: SeasonalEvent[];
}

export interface EvaluateTopicInput {
  topic: Topic;
  asOfDate: string;
  memory: VideoMemoryRecord[];
  publishedTopicIds?: string[];
  avoidedTopicIds?: string[];
  campaignMode?: CampaignModeId;
  recentSeriesIds?: ContentSeriesId[];
  /** Optional keyword saturation hints from analytics. */
  saturatedTopicIds?: string[];
}
