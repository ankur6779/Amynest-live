/**
 * Continuous Learning Engine types.
 * Additive feedback layer — not a WorkflowPhase; does not alter production modules.
 */

import type { VideoPerformanceMetrics } from "../types/analytics.js";
import type { ContentSeriesId } from "../content-intelligence/types.js";

export const CONTINUOUS_LEARNING_VERSION = "1.0.0";

export type LearningPlatform =
  | "youtube"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "future";

export type HookStyle =
  | "emotional"
  | "educational"
  | "question"
  | "bold-claim"
  | "story";

export type CtaVariant = "soft" | "direct" | "app-demo" | "habit";

export type MusicStyle =
  | "warm-ambient"
  | "uplifting"
  | "calm-piano"
  | "playful"
  | "cosmic-soft"
  | "unknown";

export type CameraStyleDna =
  | "push-in"
  | "hold"
  | "orbit"
  | "pull-out"
  | "static"
  | "mixed";

export type ThumbnailStyle =
  | "emotion-closeup"
  | "parent-child"
  | "app-ui"
  | "brand-end"
  | "unknown";

/** Permanent DNA profile for every published video. */
export interface VideoDna {
  videoId: string;
  publishedVideoId: string;
  goldenScriptId: string | null;
  hook: string;
  hookStyle: HookStyle;
  topicId: string;
  topicTitle: string;
  feature: string;
  characters: string[];
  emotion: string;
  musicStyle: MusicStyle;
  cameraStyle: CameraStyleDna;
  sceneCount: number;
  durationSeconds: number;
  ctaVariant: CtaVariant;
  ctaText: string;
  publishTime: string;
  publishHour: number;
  dayOfWeek: string;
  campaign: string;
  season: string;
  platform: LearningPlatform;
  seriesId: ContentSeriesId | string;
  thumbnailStyle: ThumbnailStyle;
  createdAt: string;
}

/** Normalized multi-platform performance (extends YouTube metrics). */
export interface PlatformPerformance {
  videoId: string;
  platform: LearningPlatform;
  collectedAt: string;
  impressions: number;
  views: number;
  averageViewDurationSeconds: number;
  retention: number;
  /** Optional sampled retention curve 0–100 by second bucket. */
  retentionCurve: number[];
  completionRate: number;
  ctr: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  subscribers: number;
  trafficSource: string;
  watchTimeMinutes: number;
  /** Composite 0–100 performance score. */
  performanceScore: number;
  raw?: VideoPerformanceMetrics;
}

export interface CorrelationInsight {
  id: string;
  dimension:
    | "hookStyle"
    | "emotion"
    | "ctaVariant"
    | "characters"
    | "duration"
    | "publishHour"
    | "musicStyle"
    | "cameraStyle"
    | "series"
    | "season"
    | "platform";
  winner: string;
  loser?: string;
  winnerScore: number;
  loserScore?: number;
  lift: number;
  sampleSize: number;
  confidence: number;
  rationale: string;
}

export interface KnowledgeEntry {
  id: string;
  kind:
    | "winning-hook"
    | "winning-story"
    | "winning-emotion"
    | "winning-visual"
    | "winning-music"
    | "winning-camera"
    | "winning-thumbnail"
    | "winning-schedule"
    | "winning-cta"
    | "winning-duration";
  value: string;
  score: number;
  evidenceVideoIds: string[];
  updatedAt: string;
  notes: string;
}

export interface PromptOptimizationHints {
  preferHookStyles: HookStyle[];
  preferEmotions: string[];
  preferCtaVariants: CtaVariant[];
  preferDurations: number[];
  preferPublishHours: number[];
  preferMusicStyles: MusicStyle[];
  preferCameraStyles: CameraStyleDna[];
  preferCharacters: string[];
  systemPromptAddendum: string;
  priorityBoosts: Array<{ pattern: string; boost: number; reason: string }>;
}

export type ExperimentKind =
  | "hook"
  | "cta"
  | "intro"
  | "pacing"
  | "duration"
  | "publish-time";

export interface LearningExperiment {
  id: string;
  kind: ExperimentKind;
  label: string;
  variantA: string;
  variantB: string;
  status: "planned" | "running" | "completed";
  winner?: "A" | "B";
  lift?: number;
  confidence?: number;
  rationale: string;
}

export interface FailureAnalysis {
  videoId: string;
  title: string;
  performanceScore: number;
  causes: Array<{
    code:
      | "weak-hook"
      | "long-intro"
      | "too-much-narration"
      | "weak-cta"
      | "visual-clutter"
      | "poor-pacing"
      | "topic-saturation"
      | "wrong-publish-timing"
      | "low-retention"
      | "low-ctr";
    message: string;
    recommendation: string;
  }>;
  summary: string;
}

export interface MonthlyEvolutionReport {
  id: string;
  month: string;
  generatedAt: string;
  top10: Array<{ videoId: string; title: string; score: number }>;
  bottom10: Array<{ videoId: string; title: string; score: number }>;
  fastestGrowingTopics: string[];
  decliningTopics: string[];
  bestCampaigns: string[];
  bestSeries: string[];
  optimizationRecommendations: string[];
  markdown: string;
}

export interface ContinuousLearningResult {
  version: typeof CONTINUOUS_LEARNING_VERSION;
  generatedAt: string;
  dnaProfiles: VideoDna[];
  performances: PlatformPerformance[];
  correlations: CorrelationInsight[];
  knowledge: KnowledgeEntry[];
  promptHints: PromptOptimizationHints;
  experiments: LearningExperiment[];
  failures: FailureAnalysis[];
  monthlyReport?: MonthlyEvolutionReport;
}
