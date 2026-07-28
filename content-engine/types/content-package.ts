import type { AgeGroup, Topic, TopicCategory, VideoStyle } from "./index.js";

/** Timed caption segment (FFmpeg-compatible timing in seconds). */
export interface CaptionSegment {
  start: number;
  end: number;
  text: string;
  style: CaptionStyle;
  position: CaptionPosition;
}

export type CaptionStyle = "default" | "emphasis" | "cta" | "question";
export type CaptionPosition = "bottom" | "center" | "top";

/** Production-ready content package for a scheduled topic. */
export interface ContentPackage {
  topic: Topic;
  title: string;
  alternateTitles: string[];
  hook: string;
  openingQuestion: string;
  story: string;
  keyPoints: string[];
  cta: string;
  voiceScript: string;
  sceneScript: string;
  captions: CaptionSegment[];
  description: string;
  hashtags: string[];
  keywords: string[];
  seoScore: number;
  /** Estimated reading/speaking time for the voice script in seconds. */
  readingTime: number;
  estimatedDuration: number;
  language: string;
  provider: string;
  generatedAt: string;
  version: string;
}

/** Input contract for Phase 2 content generation. */
export interface ContentGenerationInput {
  topic: Topic;
  category: TopicCategory;
  ageGroup: AgeGroup;
  language: string;
  duration: number;
  videoStyle: VideoStyle;
}

export interface TitleSet {
  primary: string;
  alternates: string[];
  short: string;
  highCtr: string;
  searchOptimized: string;
}

export interface DescriptionParts {
  seo: string;
  appPromotion: string;
  playStoreCta: string;
  website: string;
  socialLinks: string;
  disclaimer: string;
}

/** Structured JSON payload returned by AI script generation. */
export interface GeneratedScriptPayload {
  hook: string;
  openingQuestion: string;
  story: string;
  keyPoints: string[];
  cta: string;
  voiceScript: string;
  sceneScript: string;
  titles: TitleSet;
  description: DescriptionParts;
  hashtags: string[];
  keywords: string[];
}

export interface SeoScoreBreakdown {
  overall: number;
  keywordDensity: number;
  readability: number;
  titleQuality: number;
  descriptionQuality: number;
  hashtagDiversity: number;
}

export interface QualityScoreBreakdown {
  overall: number;
  clarity: number;
  emotion: number;
  curiosity: number;
  retention: number;
  ctrPotential: number;
  brandConsistency: number;
}

export interface ModerationViolation {
  code: string;
  message: string;
  severity: "reject" | "warn";
}

export interface ModerationResult {
  ok: boolean;
  violations: ModerationViolation[];
}

export const CONTENT_PACKAGE_VERSION = "2.0.0";

export type ScriptProviderId = "mock" | "openai" | "future";

export interface OpenAIProviderSettings {
  apiKeyEnv: string;
  model: string;
  baseUrl: string;
}

export interface ContentGenerationSettings {
  scriptProvider: ScriptProviderId;
  fallbackProvider: ScriptProviderId;
  defaultLanguage: string;
  fallbackLanguage: string;
  maxRetries: number;
  /** Cache time-to-live in seconds. */
  cacheTTL: number;
  minimumQualityScore: number;
  minimumSEOScore: number;
  openai: OpenAIProviderSettings;
}
