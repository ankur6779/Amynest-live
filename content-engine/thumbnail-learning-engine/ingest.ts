/**
 * Ingest published video + thumbnail features + REAL YouTube Analytics metrics.
 */

import { createHash } from "node:crypto";
import type { VideoPerformanceMetrics } from "../types/analytics.js";
import type { ContentPackage } from "../types/content-package.js";
import type { ThumbnailEnginePackage } from "../thumbnail-engine/types.js";
import type {
  CharacterCastLayout,
  HeadlineStyle,
  ThumbnailLearningFeatures,
  ThumbnailLearningOutcomes,
  ThumbnailLearningRecord,
} from "./types.js";

export interface IngestPublishedThumbnailInput {
  videoId: string;
  title?: string;
  contentPackage?: ContentPackage | null;
  /** Optional snapshot from Thumbnail Engine 2.0 (features only — engine not modified). */
  thumbnailPackage?: ThumbnailEnginePackage | null;
  /** REAL analytics from YouTubeAnalyticsProvider / MockAnalyticsProvider. */
  metrics: VideoPerformanceMetrics;
  publishedAt?: string;
  thumbnailPath?: string;
  /** Minimum impressions before trusting CTR (default 100). */
  minImpressions?: number;
}

export function buildLearningRecord(
  input: IngestPublishedThumbnailInput,
): ThumbnailLearningRecord {
  const features = extractFeatures(input);
  const outcomes = extractOutcomes(input.metrics);
  const now = new Date().toISOString();
  const id = createHash("sha256")
    .update(`tlr|${input.videoId}`)
    .digest("hex")
    .slice(0, 16);

  return {
    id: `tlr_${id}`,
    videoId: input.videoId,
    title: input.title || input.contentPackage?.title || input.videoId,
    thumbnailPath: input.thumbnailPath || input.thumbnailPackage?.assets.jpgPath,
    features,
    outcomes,
    reasons: [],
    createdAt: now,
    updatedAt: now,
  };
}

function extractOutcomes(
  metrics: VideoPerformanceMetrics,
): ThumbnailLearningOutcomes {
  const ctr = clamp01(metrics.ctr);
  const views = Math.max(0, metrics.views);
  // Derive impressions from real CTR when Analytics gives CTR + views.
  const impressions =
    ctr > 0.0001 ? Math.max(views, Math.round(views / ctr)) : views;
  return {
    ctr,
    impressions,
    views,
    watchTimeMinutes: metrics.watchTimeMinutes,
    averageViewDurationSeconds: metrics.averageViewDurationSeconds,
    retention: clamp01(metrics.retention),
    collectedAt: metrics.collectedAt,
  };
}

function extractFeatures(
  input: IngestPublishedThumbnailInput,
): ThumbnailLearningFeatures {
  const thumb = input.thumbnailPackage;
  const content = input.contentPackage;
  const published = input.publishedAt
    ? new Date(input.publishedAt)
    : new Date(input.metrics.collectedAt);
  const day = published.toISOString().slice(0, 10);
  const time = published.toISOString().slice(11, 16);

  const headline =
    thumb?.headline ||
    content?.topic.title?.split(/\s+/).slice(0, 4).join(" ") ||
    "Daily Learning";
  const partner = thumb?.partner ?? "amy-girl";
  const characters = castFromPartner(partner, thumb);
  const emotion =
    thumb?.intelligence?.metrics
      ? emotionFromFocus(thumb.intelligence.chosenVariant, thumb.intelligence)
      : "hope";

  return {
    variant: thumb?.intelligence?.chosenVariant ?? "unknown",
    headline,
    headlineLength: headline.trim().split(/\s+/).filter(Boolean).length,
    emotion,
    characters,
    faceSizePercent: thumb?.intelligence?.metrics.faceSizePercent ?? 0,
    eyeContact: thumb?.intelligence?.metrics.eyeVisibility ?? 0,
    backgroundType: "purple-stage",
    colorPalette: "amynest-purple-gold",
    featureCategory: content?.topic.category ?? "Parenting",
    topic: content?.topic.title ?? input.title ?? "unknown",
    topicCategory: content?.topic.category ?? "Parenting",
    day,
    time,
    framing: thumb?.intelligence?.chosenVariant
      ? `variant-${thumb.intelligence.chosenVariant}`
      : "standard",
    ctaStyle: "store-badges",
    headlineStyle: classifyHeadlineStyle(headline),
  };
}

function castFromPartner(
  partner: "amy-girl" | "amy-boy",
  thumb?: ThumbnailEnginePackage | null,
): CharacterCastLayout {
  const focus = thumb?.intelligence?.variants.find(
    (v) => v.id === thumb.intelligence?.chosenVariant,
  )?.focus;
  if (focus === "feature-first") return partner === "amy-boy" ? "amy-boy" : "amy-girl";
  // Default AmyNest thumbs are Amy + child relationship
  return partner === "amy-boy" ? "amy-boy" : "amy-girl";
}

function emotionFromFocus(
  variant: string,
  intel: NonNullable<ThumbnailEnginePackage["intelligence"]>,
): string {
  const plan = intel.variants.find((v) => v.id === variant);
  if (plan?.focus === "emotion-first") return "warm-encourage";
  if (plan?.focus === "character-first") return "help-bond";
  if (plan?.focus === "feature-first") return "curious-learn";
  return "hope";
}

function classifyHeadlineStyle(headline: string): HeadlineStyle {
  const h = headline.toLowerCase();
  if (/better|smarter|clearer|magic/.test(h)) return "benefit";
  if (/happy|calm|healthy|love/.test(h)) return "emotion";
  if (/learn|read|speech|routine|habit|astro|star/.test(h)) return "feature";
  if (/panic|now|today/.test(h)) return "urgency";
  return "other";
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Skip records with too few impressions — avoid noisy CTR. */
export function isTrustedSample(
  record: ThumbnailLearningRecord,
  minImpressions = 100,
): boolean {
  return record.outcomes.impressions >= minImpressions;
}
