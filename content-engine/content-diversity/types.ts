/**
 * Content Diversity — production fix for same-feeling Shorts.
 * Additive. Does not modify AI Director, Performance Director, validators, or render.
 */

export const CONTENT_DIVERSITY_VERSION = "1.0.0";

export const DIVERSITY_TARGET_SCORE = 90;
export const MAX_SIMILARITY_TO_RECENT = 0.4;
export const RECENT_WINDOW = 10;

export type DiversityTopicBucket =
  | "learning"
  | "phonics"
  | "reading"
  | "speech"
  | "health"
  | "games"
  | "astro"
  | "routine"
  | "parenting"
  | "coach";

export type ThumbnailHeroStyle =
  | "amy-girl-hero"
  | "amy-boy-hero"
  | "amy-ai-hero"
  | "parent-child"
  | "two-children"
  | "family"
  | "feature-ui"
  | "emotion"
  | "reaction"
  | "question"
  | "success"
  | "curiosity"
  | "hope";

export type AmyPoseId =
  | "sitting"
  | "kneeling"
  | "walking"
  | "pointing"
  | "celebrating"
  | "reading"
  | "floating-beside"
  | "drawing"
  | "high-five"
  | "helping"
  | "encouraging"
  | "listening"
  | "watching"
  | "interacting";

export interface DiversityFingerprint {
  id: string;
  goldenScriptId?: string;
  videoId?: string;
  createdAt: string;
  topicBucket: DiversityTopicBucket;
  locations: string[];
  cameras: string[];
  amyPoses: string[];
  featureProps: string[];
  title: string;
  descriptionSeed: string;
  hashtags: string[];
  playlist: string;
  thumbnailHero: ThumbnailHeroStyle;
  ctaWording: string;
}

export interface DiversityMetadataPlan {
  title: string;
  description: string;
  hashtags: string[];
  playlistName: string;
  thumbnailHero: ThumbnailHeroStyle;
  thumbnailHeadline: string;
  ctaWording: string;
  featureProps: string[];
  topicBucket: DiversityTopicBucket;
}

export interface SimilarityBreakdown {
  scenes: number;
  backgrounds: number;
  cameras: number;
  characterPoses: number;
  thumbnail: number;
  title: number;
  description: number;
  tags: number;
  hashtags: number;
  cta: number;
  overall: number;
}

export interface DiversityGateResult {
  ok: boolean;
  diversityScore: number;
  similarityToRecent: number;
  maxSimilarityPeerId?: string;
  breakdown: SimilarityBreakdown;
  fingerprint: DiversityFingerprint;
  metadata: DiversityMetadataPlan;
  reasons: string[];
  reportPath?: string;
}

export interface ContentDiversityReport {
  version: typeof CONTENT_DIVERSITY_VERSION;
  generatedAt: string;
  goldenScriptId?: string;
  diversityScore: number;
  similarityToRecent: number;
  targetScore: number;
  maxSimilarityAllowed: number;
  gate: "PASS" | "REJECT";
  breakdown: SimilarityBreakdown;
  locations: string[];
  cameras: string[];
  amyPoses: string[];
  title: string;
  playlist: string;
  thumbnailHero: ThumbnailHeroStyle;
  hashtags: string[];
  reasons: string[];
}
