/**
 * Thumbnail Learning Engine 1.0 — CTR feedback loop from real YouTube Analytics.
 * Additive only. Does not modify Thumbnail Engine, render, publish, or validators.
 */

export const THUMBNAIL_LEARNING_ENGINE_VERSION = "1.0.0";

export type CharacterCastLayout =
  | "amy-only"
  | "amy-girl"
  | "amy-boy"
  | "group";

export type BackgroundType =
  | "purple-stage"
  | "home"
  | "study"
  | "other";

export type ColorPaletteId =
  | "amynest-purple-gold"
  | "warm-soft"
  | "cool-soft"
  | "other";

export type HeadlineStyle =
  | "benefit"
  | "emotion"
  | "feature"
  | "urgency"
  | "other";

export type CtaStyle = "soft-invite" | "store-badges" | "logo-only" | "none";

export interface ThumbnailLearningFeatures {
  variant: "A" | "B" | "C" | "unknown";
  headline: string;
  headlineLength: number;
  emotion: string;
  characters: CharacterCastLayout;
  faceSizePercent: number;
  eyeContact: number;
  backgroundType: BackgroundType;
  colorPalette: ColorPaletteId;
  featureCategory: string;
  topic: string;
  topicCategory: string;
  day: string; // YYYY-MM-DD publish day
  time: string; // HH:mm publish time (UTC or local label)
  framing?: string;
  ctaStyle: CtaStyle;
  headlineStyle: HeadlineStyle;
}

export interface ThumbnailLearningOutcomes {
  /** Real YouTube Analytics CTR (0–1). */
  ctr: number;
  impressions: number;
  views: number;
  watchTimeMinutes: number;
  averageViewDurationSeconds: number;
  retention: number;
  collectedAt: string;
}

export interface ThumbnailLearningRecord {
  id: string;
  videoId: string;
  title: string;
  thumbnailPath?: string;
  features: ThumbnailLearningFeatures;
  outcomes: ThumbnailLearningOutcomes;
  /** Human-readable reason tags for wins/losses (filled by pattern engine). */
  reasons: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PatternWinner {
  dimension: string;
  value: string;
  sampleSize: number;
  averageCtr: number;
  averageRetention: number;
}

export interface ThumbnailLearningPatterns {
  headlineLength: PatternWinner[];
  emotions: PatternWinner[];
  characters: PatternWinner[];
  backgrounds: PatternWinner[];
  colors: PatternWinner[];
  headlineStyles: PatternWinner[];
  ctaStyles: PatternWinner[];
  layouts: PatternWinner[];
  framings: PatternWinner[];
  updatedAt: string;
}

/** Recommendations for future generation — written to disk; Thumbnail Engine unchanged. */
export interface ThumbnailLearningRecommendations {
  version: typeof THUMBNAIL_LEARNING_ENGINE_VERSION;
  updatedAt: string;
  targetCtr: number;
  longTermTargetCtr: number;
  highestCtrLayouts: string[];
  highestCtrColors: string[];
  highestCtrCharacterPlacement: string[];
  highestCtrHeadlineStyle: string[];
  highestCtrFraming: string[];
  highestCtrEmotions: string[];
  preferredHeadlineLength: number | null;
  preferredCtaStyle: string | null;
  notes: string[];
  basedOnSampleSize: number;
}

export interface ThumbnailLearningDashboard {
  averageCtr: number;
  ctrTrend: Array<{ day: string; averageCtr: number; videos: number }>;
  winningEmotions: PatternWinner[];
  winningColors: PatternWinner[];
  winningLayouts: PatternWinner[];
  winningCharacters: PatternWinner[];
  winningHeadlines: Array<{ headline: string; averageCtr: number; sampleSize: number }>;
  sampleSize: number;
  targetCtr: number;
  longTermTargetCtr: number;
}

export interface ThumbnailLearningStoreSnapshot {
  version: typeof THUMBNAIL_LEARNING_ENGINE_VERSION;
  records: ThumbnailLearningRecord[];
  patterns: ThumbnailLearningPatterns | null;
  recommendations: ThumbnailLearningRecommendations | null;
  top100: string[]; // record ids
  worst100: string[];
  updatedAt: string;
}

export interface ThumbnailLearningPackage {
  id: string;
  version: typeof THUMBNAIL_LEARNING_ENGINE_VERSION;
  createdAt: string;
  ingested: number;
  sampleSize: number;
  averageCtr: number;
  patterns: ThumbnailLearningPatterns;
  recommendations: ThumbnailLearningRecommendations;
  dashboard: ThumbnailLearningDashboard;
  reportPaths: {
    learning: string;
    top: string;
    low: string;
    monthly: string;
    dashboardHtml: string;
    recommendationsJson: string;
  };
  summary: string;
}
