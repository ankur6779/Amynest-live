import type { NotificationCategory } from "@workspace/db";
import type { ActiveCalendarContext } from "./global/calendar.js";
import type { CulturalRegion, SupportedLocale } from "./global/locales.js";
import type { WeatherContext } from "./global/weather.js";
import type { BusinessImpactScores } from "./outcomes/types.js";

export type ContentType =
  | "educational"
  | "motivational"
  | "curiosity"
  | "achievement"
  | "parent_insight"
  | "action_challenge"
  | "routine"
  | "reminder";

export type AgeGroup = "toddler" | "preschool" | "child" | "tween";

export type TimeOfDay = "morning" | "midday" | "afternoon" | "evening" | "night";

export interface ContentContext {
  userId: string;
  childId: number;
  childName: string;
  age: number;
  ageMonths: number;
  ageGroup: AgeGroup;
  foodType: string;
  timezone: string;
  localDate: string;
  timeOfDay: TimeOfDay;
  isWeekend: boolean;
  isSchoolDay: boolean;
  season: Season;
  engagementScore: number;
  category: NotificationCategory;
  locale: SupportedLocale;
  countryCode: string;
  culturalRegion: CulturalRegion;
  calendar: ActiveCalendarContext;
  weather?: WeatherContext | null;
  rtl: boolean;
  allergies?: string[];
}

export type Season = "spring" | "summer" | "monsoon" | "winter" | "festive";

export interface PoolContentItem {
  /** Stable recommendation key — e.g. food slug or activity id */
  recommendationKey: string;
  /** Grouping for 7-day topic exclusion */
  topicKey: string;
  /** Daily diversity theme bucket */
  theme: string;
  contentType: ContentType;
  title: string;
  body: string;
  deepLink: string;
  /** Optional filters */
  ageGroups?: AgeGroup[];
  weekendOnly?: boolean;
  weekdayOnly?: boolean;
  timeOfDay?: TimeOfDay[];
  seasons?: Season[];
  minEngagement?: number;
  highValue?: boolean;
  /** Nutrition pool: veg | egg */
  diet?: "veg" | "egg" | "any";
  /** Cultural regions where this item is appropriate */
  regions?: CulturalRegion[];
}

export interface RenderedNotification {
  title: string;
  body: string;
  deepLink: string;
  dedupKey: string;
  recommendationKey: string;
  topicKey: string;
  theme: string;
  contentType: ContentType;
  contentHash: string;
  data?: Record<string, unknown>;
}

export interface QualityScores {
  novelty: number;
  relevance: number;
  recency: number;
  engagementPrediction: number;
  composite: number;
}

export interface HistoryEntry {
  category: string;
  title: string;
  body: string;
  contentHash: string | null;
  topicKey: string | null;
  recommendationKey: string | null;
  theme: string | null;
  contentType?: string | null;
  goal?: string | null;
  sentAt: Date;
  openedAt: Date | null;
  dismissedAt: Date | null;
  outcomeEvent?: string | null;
  outcomeAt?: Date | null;
}

export interface FatigueState {
  consecutiveIgnores: number;
  rollingIgnores30d: number;
  frequencyMultiplier: number;
  highValueOnly: boolean;
  lastOpenedAt: Date | null;
}

export interface UserContentHistory {
  entries: HistoryEntry[];
  fatigue: FatigueState;
  engagementScore: number;
  sentToday: HistoryEntry[];
}

export interface AdaptiveBuildResult {
  notification: RenderedNotification;
  scores: QualityScores;
  businessImpact?: BusinessImpactScores;
}

export const HIGH_VALUE_CATEGORIES = new Set<NotificationCategory>([
  "routine",
  "routine_item",
  "insights",
  "milestone",
  "weekly",
]);

export const MIN_POOL_SIZES: Partial<Record<NotificationCategory, number>> = {
  nutrition: 200,
  parenting_tips: 300,
  learning_activity: 500,
  engagement: 200,
  story_time: 300,
};
