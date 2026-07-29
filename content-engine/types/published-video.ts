import type { ContentPackage } from "./content-package.js";
import type { RenderPackage } from "./render-package.js";

export const PUBLISHED_VIDEO_VERSION = "6.0.0";

export type PublishingProviderId = "mock" | "youtube" | "future";

export type VideoVisibility = "private" | "unlisted" | "public" | "draft";

export type ScheduleMode = "immediate" | "scheduled" | "draft";

export type NotificationChannel =
  | "telegram"
  | "email"
  | "webhook"
  | "slack"
  | "discord";

export type NotificationEventKind =
  | "success"
  | "failure"
  | "retry"
  | "published";

export type AuditAction =
  | "upload"
  | "retry"
  | "metadata_update"
  | "visibility_change"
  | "schedule"
  | "publish"
  | "delete"
  | "verify";

export type PublishingErrorCode =
  | "quota"
  | "network"
  | "auth"
  | "validation"
  | "not_found"
  | "conflict"
  | "unknown";

export interface PublishingEngineSettings {
  publishingProvider: PublishingProviderId;
  defaultVisibility: VideoVisibility;
  playlist: string;
  uploadRetries: number;
  notificationChannels: NotificationChannel[];
  schedulePolicy: SchedulePolicy;
  categoryId: string;
  license: "youtube" | "creativeCommon";
  /** COPPA "Made for Kids" — default false (parent/caregiver audience). */
  madeForKids: boolean;
  /** Disclose AI / synthetic media via status.containsSyntheticMedia. */
  aiDisclosure: boolean;
  retryBaseDelayMs: number;
  retryMaxDelayMs: number;
  deadLetterEnabled: boolean;
}

export interface SchedulePolicy {
  mode: ScheduleMode;
  /** IANA timezone used when resolving scheduled publish times. */
  timezone: string;
  /** Optional fixed offset minutes from config uploadTime when mode is scheduled. */
  uploadOffsetMinutes: number;
}

export interface PublishMetadata {
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  language: string;
  playlistId: string;
  /** Human playlist label (Study Zone, Speech, …). */
  playlistName?: string;
  visibility: VideoVisibility;
  license: "youtube" | "creativeCommon";
  madeForKids: boolean;
  selfDeclaredMadeForKids: boolean;
  /** YouTube status.containsSyntheticMedia (AI / altered content disclosure). */
  containsSyntheticMedia: boolean;
  /** Publishing polish (pinned comment, i18n, variants, SEO scorecard). */
  polish?: import("./publishing-polish.js").PublishingPolish;
}

export interface PublishMetadataOverrides {
  title?: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  language?: string;
  playlistId?: string;
  playlistName?: string;
  visibility?: VideoVisibility;
  license?: "youtube" | "creativeCommon";
  madeForKids?: boolean;
  containsSyntheticMedia?: boolean;
}

export interface ThumbnailResolution {
  path: string;
  source: "generated" | "fallback" | "branding-default";
  applied: boolean;
}

export interface SchedulePlan {
  mode: ScheduleMode;
  visibility: VideoVisibility;
  /** ISO timestamp when the video should go live; null for draft/immediate-without-schedule. */
  publishAt: string | null;
  timezone: string;
}

export interface RetryAttempt {
  attempt: number;
  at: string;
  errorCode: PublishingErrorCode;
  message: string;
  delayMs: number;
}

export interface DeadLetterRecord {
  id: string;
  idempotencyKey: string;
  renderPackageId: string;
  failedAt: string;
  lastError: string;
  errorCode: PublishingErrorCode;
  retryHistory: RetryAttempt[];
}

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  at: string;
  provider: PublishingProviderId;
  videoId?: string;
  details: Record<string, string | number | boolean | null>;
}

export interface NotificationPayload {
  channel: NotificationChannel;
  event: NotificationEventKind;
  title: string;
  body: string;
  videoId?: string;
  url?: string;
  at: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface NotificationDelivery {
  channel: NotificationChannel;
  event: NotificationEventKind;
  delivered: boolean;
  at: string;
  detail?: string;
}

export interface PublishingTelemetry {
  uploadDurationMs: number;
  apiLatencyMs: number;
  retries: number;
  quotaUnits: number;
  failures: number;
  provider: PublishingProviderId;
  verificationMs: number;
}

export interface PublishVerificationReport {
  ok: boolean;
  videoExists: boolean;
  thumbnailApplied: boolean;
  metadataApplied: boolean;
  visibilityCorrect: boolean;
  durationMatch: boolean;
  resolutionMatch: boolean;
  issues: string[];
  checkedAt: string;
}

export interface PersistedPublishRecord {
  id: string;
  videoId: string;
  url: string;
  uploadedAt: string;
  publishedAt: string | null;
  visibility: VideoVisibility;
  metadata: PublishMetadata;
  provider: PublishingProviderId;
  checksum: string;
  renderPackageId: string;
  contentPackageTopicId: string;
  idempotencyKey: string;
  retryHistory: RetryAttempt[];
  thumbnail: ThumbnailResolution;
  schedule: SchedulePlan;
}

export interface PublishedVideo {
  id: string;
  version: string;
  videoId: string;
  url: string;
  publishedAt: string | null;
  uploadedAt: string;
  visibility: VideoVisibility;
  metadata: PublishMetadata;
  provider: PublishingProviderId;
  thumbnail: ThumbnailResolution;
  schedule: SchedulePlan;
  verification: PublishVerificationReport;
  retryHistory: RetryAttempt[];
  notifications: NotificationDelivery[];
  auditLog: AuditLogEntry[];
  checksum: string;
  renderPackageId: string;
  telemetry: PublishingTelemetry;
}

export interface PublishingProviderHealth {
  ok: boolean;
  message?: string;
  checkedAt: string;
  quotaRemaining?: number;
}

export interface UploadRequest {
  jobId: string;
  idempotencyKey: string;
  videoPath: string;
  thumbnailPath: string | null;
  metadata: PublishMetadata;
  schedule: SchedulePlan;
  durationSeconds: number;
  width: number;
  height: number;
  checksum: string;
}

export interface UploadResult {
  videoId: string;
  url: string;
  uploadedAt: string;
  visibility: VideoVisibility;
  provider: PublishingProviderId;
  apiLatencyMs: number;
  quotaUnits: number;
  thumbnailApplied: boolean;
}

export interface UpdateRequest {
  videoId: string;
  metadata: Partial<PublishMetadata>;
}

export interface ScheduleRequest {
  videoId: string;
  schedule: SchedulePlan;
}

export interface PublishRequest {
  videoId: string;
  visibility: Exclude<VideoVisibility, "draft">;
  publishAt?: string | null;
}

export interface VerifyRequest {
  videoId: string;
  expected: {
    title: string;
    visibility: VideoVisibility;
    durationSeconds: number;
    width: number;
    height: number;
    thumbnailPath: string | null;
  };
}

export interface PublishingInput {
  render: RenderPackage;
  content: ContentPackage;
  overrides?: PublishMetadataOverrides;
  /** Optional generated thumbnail path; resolver falls back when absent. */
  thumbnailPath?: string;
  /** Override schedule mode for this publish job. */
  scheduleMode?: ScheduleMode;
  /** Explicit publish-at ISO timestamp (timezone-aware scheduling). */
  publishAt?: string;
  /** Stable key for idempotent uploads. */
  idempotencyKey?: string;
}

export type PublishedExportFormat = "json" | "yaml" | "publish-manifest-v1";

export interface PublishedExportResult {
  format: PublishedExportFormat;
  content: string;
  contentType: string;
}

export interface YouTubeProviderSettings {
  accessTokenEnv?: string;
  refreshTokenEnv?: string;
  clientIdEnv?: string;
  clientSecretEnv?: string;
  apiBaseUrl?: string;
  channelId?: string;
}
