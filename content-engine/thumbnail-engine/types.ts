/**
 * AmyNest Thumbnail Engine 2.0 — CTR-first + Shorts cover intelligence.
 * Additive layer only. No render / publish / validator changes.
 */

export const THUMBNAIL_ENGINE_VERSION = "2.0.0";

export type ThumbnailRejectCode =
  | "tiny-text"
  | "low-contrast"
  | "busy-background"
  | "blurry-faces"
  | "oversize"
  | "wrong-dimensions"
  | "unsafe-crop"
  | "ok";

export type ThumbnailVariantId = "A" | "B" | "C";

export type ThumbnailVariantFocus =
  | "emotion-first"
  | "character-first"
  | "feature-first";

export type InteractionPose =
  | "helping"
  | "pointing"
  | "celebrating"
  | "encouraging";

export interface ThumbnailAssets {
  jpgPath: string;
  webpPath: string;
  previewPath: string;
  coverStillPath: string;
  coverClipPath?: string;
  mobilePreviewPath?: string;
}

export interface ThumbnailUploadResult {
  attempted: boolean;
  success: boolean;
  unsupported: boolean;
  httpStatus?: number;
  apiResponse?: string;
  reason?: string;
  logLine: string;
}

export interface ThumbnailQualityResult {
  ok: boolean;
  score: number;
  rejects: Array<{ code: ThumbnailRejectCode; reason: string }>;
  summary: string;
}

export interface ThumbnailMetrics {
  faceSizePercent: number;
  eyeVisibility: number;
  headlineReadability: number;
  contrast: number;
  mobilePreview120: number;
  safeArea: number;
  characterVisibility: number;
  logoVisibility: number;
  storeBadgeVisibility: number;
  relationshipScore: number;
}

export interface ThumbnailVariantPlan {
  id: ThumbnailVariantId;
  focus: ThumbnailVariantFocus;
  headline: string;
  interaction: InteractionPose;
  assets: ThumbnailAssets;
  metrics: ThumbnailMetrics;
  predictedCtr: number;
  quality: ThumbnailQualityResult;
}

export interface YouTubeThumbnailStatus {
  checked: boolean;
  customThumbnailApplied: boolean | null;
  shortsLikelyUsesFirstFrame: boolean | null;
  waitedMs: number;
  evidence: string;
  thumbnailUrls?: Record<string, string>;
}

export interface ThumbnailIntelligence {
  chosenVariant: ThumbnailVariantId;
  variants: ThumbnailVariantPlan[];
  predictedCtr: number;
  firstFrameSimilarity: number;
  youtubeStatus: YouTubeThumbnailStatus;
  hookAlignment: string;
  liveCover: boolean;
  metrics: ThumbnailMetrics;
  intelligenceReportPath: string;
}

export interface ThumbnailEnginePackage {
  id: string;
  version: typeof THUMBNAIL_ENGINE_VERSION;
  createdAt: string;
  title: string;
  headline: string;
  partner: "amy-girl" | "amy-boy";
  assets: ThumbnailAssets;
  quality: ThumbnailQualityResult;
  /** 0–100 similarity between thumbnail design and video first frame. */
  firstFrameSimilarity: number;
  coverApplied: boolean;
  upload: ThumbnailUploadResult;
  reportPath: string;
  summary: string;
  /** v2.0 CTR / Shorts intelligence (present when intelligence layer runs). */
  intelligence?: ThumbnailIntelligence;
}
