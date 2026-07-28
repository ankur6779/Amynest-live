/** Shared TypeScript contracts for the AmyNest YouTube Content Engine. */

export const TOPIC_CATEGORIES = [
  "Parenting",
  "Child Development",
  "Baby Care",
  "Sleep",
  "Speech",
  "Autism",
  "ADHD",
  "Emotional Intelligence",
  "Routines",
  "Family Activities",
  "Learning",
  "Brain Development",
  "Nutrition",
  "Child Psychology",
  "Amy Astro",
  "Daily Motivation",
  "Screen Time",
  "Games",
  "Milestones",
  "Safety",
] as const;

export type TopicCategory = (typeof TOPIC_CATEGORIES)[number];

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const AGE_GROUPS = [
  "0-12m",
  "1-3y",
  "3-5y",
  "5-8y",
  "8-12y",
  "all",
] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const VIDEO_STYLES = [
  "short",
  "talking-head",
  "story",
  "listicle",
  "demo",
  "astro",
  "motivation",
  "app-feature",
] as const;
export type VideoStyle = (typeof VIDEO_STYLES)[number];

export const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

/** Evergreen content topic used by calendar + rotation engines. */
export interface Topic {
  id: string;
  title: string;
  category: TopicCategory;
  difficulty: Difficulty;
  ageGroup: AgeGroup;
  keywords: string[];
  cta: string;
  /** Higher = schedule sooner when other factors tie (1–10). */
  priority: number;
  /** Target runtime in seconds. */
  estimatedDuration: number;
  videoStyle: VideoStyle;
}

/** One publishable slot within a weekday. */
export interface DaySlot {
  slotId: string;
  label: string;
  preferredCategories: TopicCategory[];
  preferredVideoStyles?: VideoStyle[];
  /** Minutes after base uploadTime for this slot (same day). */
  uploadOffsetMinutes?: number;
}

/** Weekly multi-slot calendar definition. */
export type WeekCalendar = Record<DayOfWeek, DaySlot[]>;

/** A topic assigned to a concrete calendar slot on a date. */
export interface ScheduledVideo {
  date: string;
  dayOfWeek: DayOfWeek;
  slot: DaySlot;
  topic: Topic;
  scheduledUploadAt: string;
}

/** Multi-day schedule produced by the scheduler. */
export interface ContentSchedule {
  timezone: string;
  generatedAt: string;
  videos: ScheduledVideo[];
}

/** History of topic usage for the 45-day rotation window. */
export interface TopicHistoryEntry {
  topicId: string;
  usedAt: string;
  date: string;
  slotId?: string;
  category?: TopicCategory;
}

export interface ContentEngineFeatures {
  rotation: boolean;
  multiVideoDay: boolean;
  astroSlot: boolean;
  appFeatureSlot: boolean;
}

export interface ContentEngineMusicConfig {
  enabled: boolean;
  defaultTrackId: string;
  volume: number;
}

export interface ContentEngineBrandingConfig {
  channelName: string;
  watermark: boolean;
  endScreenCta: string;
  hashtags: string[];
}

/**
 * Engine configuration (JSON-backed).
 * `videosPerDay` may be a global number or per-weekday overrides.
 * Phase 2 generation fields are optional for backward compatibility with Phase 1 JSON.
 */
export interface ContentEngineConfig {
  videosPerDay: number | Partial<Record<DayOfWeek, number>>;
  preferredCategories: TopicCategory[];
  enabledFeatures: ContentEngineFeatures;
  language: string;
  timezone: string;
  /** Base daily upload time as HH:mm (24h) in `timezone`. */
  uploadTime: string;
  music: ContentEngineMusicConfig;
  branding: ContentEngineBrandingConfig;
  /** Do not reuse a topic within this many days (default 45). */
  rotationWindowDays: number;
  /** Phase 2: primary script AI provider id. */
  scriptProvider?: import("./content-package.js").ScriptProviderId;
  /** Phase 2: fallback provider when primary fails. */
  fallbackProvider?: import("./content-package.js").ScriptProviderId;
  defaultLanguage?: string;
  fallbackLanguage?: string;
  maxRetries?: number;
  cacheTTL?: number;
  minimumQualityScore?: number;
  minimumSEOScore?: number;
  openai?: import("./content-package.js").OpenAIProviderSettings;
  /** Gemini / Veo video generation settings (optional; provider id remains google-veo). */
  geminiVideo?: Partial<import("./generated-video.js").GeminiVideoProviderSettings>;
  /** Phase 3 storyboard planning settings (optional for backward compatibility). */
  aspectRatio?: import("./storyboard.js").AspectRatio;
  resolution?: import("./storyboard.js").ResolutionPreset;
  fps?: number;
  defaultTransitions?: import("./storyboard.js").TransitionType[];
  brandingMode?: import("./storyboard.js").BrandingMode;
  animationLevel?: import("./storyboard.js").AnimationLevel;
  cameraStyle?: import("./storyboard.js").CameraStyle;
  safeMargins?: Partial<import("./storyboard.js").SafeMargins>;
  /** Phase 4 asset orchestration settings (optional for backward compatibility). */
  assetPriority?: import("./asset-package.js").AssetPriorityTier[];
  preferredProviders?: import("./asset-package.js").AssetProviderId[];
  cachePolicy?: Partial<import("./asset-package.js").AssetCachePolicy>;
  brandingProfile?: import("./asset-package.js").BrandingProfile;
  allowFallbacks?: boolean;
  maximumAIAssets?: number;
  reuseThreshold?: number;
  /** Phase 5 render-engine settings (optional for backward compatibility). */
  renderer?: import("./render-package.js").RenderProviderId;
  preferredRenderer?: import("./render-package.js").RenderProviderId;
  bitrate?: string;
  codec?: import("./render-package.js").VideoCodec;
  audioCodec?: import("./render-package.js").AudioCodec;
  outputDirectory?: string;
  hardwareAcceleration?: import("./render-package.js").HardwareAcceleration;
  subtitleMode?: import("./render-package.js").SubtitleMode;
  /** Render watermark toggle (independent of branding.watermark when set). */
  watermark?: boolean;
  outputContainer?: import("./render-package.js").OutputContainer;
  /** Phase 6 publishing settings (optional for backward compatibility). */
  publishingProvider?: import("./published-video.js").PublishingProviderId;
  defaultVisibility?: import("./published-video.js").VideoVisibility;
  playlist?: string;
  uploadRetries?: number;
  notificationChannels?: import("./published-video.js").NotificationChannel[];
  schedulePolicy?: Partial<import("./published-video.js").SchedulePolicy>;
  categoryId?: string;
  license?: "youtube" | "creativeCommon";
  madeForKids?: boolean;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
  deadLetterEnabled?: boolean;
  youtube?: import("./published-video.js").YouTubeProviderSettings;
  /** Phase 7 workflow settings (optional for backward compatibility). */
  workflowConcurrency?: number;
  maximumRetries?: number;
  resumeOnFailure?: boolean;
  notificationPolicy?: Partial<import("./workflow.js").WorkflowNotificationPolicy>;
  dailyVideoCount?: number;
  parallelRendering?: boolean;
  queueMode?: import("./workflow.js").QueueMode;
  /** Phase 8 analytics settings (optional for backward compatibility). */
  analyticsProvider?: import("./analytics.js").AnalyticsProviderId;
  reportSchedule?: import("./analytics.js").ReportSchedule;
  minimumSampleSize?: number;
  learningRetentionDays?: number;
  optimizationEnabled?: boolean;
  /** Phase 9 brain / intelligence settings (optional for backward compatibility). */
  campaignPlanningEnabled?: boolean;
  trendProvider?: import("./campaign-plan.js").TrendProviderId;
  seasonalCalendar?: string;
  abTestingEnabled?: boolean;
  predictionEnabled?: boolean;
  learningWindowDays?: number;
  confidenceThreshold?: number;
  /** Phase 10 operations settings (optional for backward compatibility). */
  runtimeEnvironment?: import("./operations.js").RuntimeEnvironment;
  opsLogLevel?: import("./operations.js").OpsLogLevel;
  dataDirectory?: string;
  backupDirectory?: string;
  healthcheckEnabled?: boolean;
  monitoringEnabled?: boolean;
  backupEnabled?: boolean;
  opsNotificationsEnabled?: boolean;
  opsNotificationChannels?: import("./operations.js").OpsNotificationChannel[];
  schedulerBackend?: import("./operations.js").OpsSchedulerBackend;
  dailyCron?: string;
  minimumDiskFreeMb?: number;
  maximumMemoryUsagePercent?: number;
  secretValidationMode?: "strict" | "permissive";
  correlationHeader?: string;
  /**
   * Provider resolution policy when the configured provider is unhealthy.
   * - mock: fall back to mock (default, backward compatible)
   * - none: fail closed (required for real production publishes)
   */
  providerFallbackMode?: "mock" | "none";
}

export interface RotationOptions {
  windowDays: number;
  preferredCategories?: TopicCategory[];
  preferredVideoStyles?: VideoStyle[];
  /** Topic IDs already selected in the current scheduling pass. */
  excludeTopicIds?: ReadonlySet<string>;
  now?: Date;
}

export interface TopicSelectionResult {
  topic: Topic;
  reason: "unused" | "oldest-eligible" | "priority-fallback";
  daysSinceLastUse: number | null;
}

export interface ValidationIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

/** Future-phase prompt blueprint (Phase 1 foundation only). */
export interface PromptBlueprint {
  id: string;
  name: string;
  purpose: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
}

/** Future-phase video template blueprint. */
export interface VideoTemplate {
  id: string;
  name: string;
  videoStyle: VideoStyle;
  aspectRatio: "9:16" | "16:9" | "1:1";
  maxDurationSeconds: number;
  sections: string[];
  defaultCta: string;
}

export type {
  CaptionPosition,
  CaptionSegment,
  CaptionStyle,
  ContentGenerationInput,
  ContentGenerationSettings,
  ContentPackage,
  DescriptionParts,
  GeneratedScriptPayload,
  ModerationResult,
  ModerationViolation,
  OpenAIProviderSettings,
  QualityScoreBreakdown,
  ScriptProviderId,
  SeoScoreBreakdown,
  TitleSet,
} from "./content-package.js";

export { CONTENT_PACKAGE_VERSION } from "./content-package.js";

export type {
  AnimationKind,
  AnimationLevel,
  AnimationPlanItem,
  AspectRatio,
  AssetRequirement,
  BrandingMode,
  BrandingPlan,
  CameraMove,
  CameraPlanItem,
  CameraStyle,
  CaptionPlan,
  CaptionPlanItem,
  ExportFormat,
  MusicPlan,
  MusicSegmentPlan,
  OverlayKind,
  OverlayPlanItem,
  RenderHints,
  ResolutionPreset,
  SafeMargins,
  SceneEmotion,
  ScenePlan,
  ScenePurpose,
  StoryboardExportResult,
  StoryboardPackage,
  StoryboardPlanningInput,
  StoryboardSettings,
  StoryboardValidationIssue,
  StoryboardValidationReport,
  SupportedDuration,
  TimelineClip,
  TimelinePlan,
  TransitionCurve,
  TransitionDirection,
  TransitionPlanItem,
  TransitionType,
  VisualType,
  VoicePlan,
  VoicePlanItem,
} from "./storyboard.js";

export {
  STORYBOARD_PACKAGE_VERSION,
  SUPPORTED_DURATIONS,
} from "./storyboard.js";

export type {
  AssetCacheMetadata,
  AssetCachePolicy,
  AssetCostEstimate,
  AssetEngineSettings,
  AssetExportFormat,
  AssetExportResult,
  AssetManifest,
  AssetManifestEntry,
  AssetPackage,
  AssetPriorityTier,
  AssetProviderHealth,
  AssetProviderId,
  AssetRequest,
  AssetResolveContext,
  AssetStatus,
  AssetValidationIssue,
  AssetValidationReport,
  BrandingAssetSet,
  BrandingProfile,
  MissingAssetRecord,
  ProviderMetadataEntry,
  ResolvedAsset,
} from "./asset-package.js";

export {
  ASSET_MANIFEST_VERSION,
  ASSET_PACKAGE_VERSION,
} from "./asset-package.js";

export type {
  GeneratedVideoAsset,
  GeneratedVideoMetadata,
  GeminiVideoProviderSettings,
} from "./generated-video.js";

export { DEFAULT_GEMINI_VIDEO_SETTINGS } from "./generated-video.js";

/** Resolved config with Phase 2 generation defaults applied. */
export type ResolvedContentEngineConfig = Required<
  Pick<
    ContentEngineConfig,
    | "scriptProvider"
    | "fallbackProvider"
    | "defaultLanguage"
    | "fallbackLanguage"
    | "maxRetries"
    | "cacheTTL"
    | "minimumQualityScore"
    | "minimumSEOScore"
    | "openai"
  >
> &
  ContentEngineConfig;

/** Resolved config with Phase 3 storyboard defaults applied. */
export type ResolvedStoryboardConfig = Required<
  Pick<
    ContentEngineConfig,
    | "aspectRatio"
    | "resolution"
    | "fps"
    | "defaultTransitions"
    | "brandingMode"
    | "animationLevel"
    | "cameraStyle"
  >
> &
  ContentEngineConfig & {
    safeMargins: import("./storyboard.js").SafeMargins;
  };

/** Resolved config with Phase 4 asset-engine defaults applied. */
export type ResolvedAssetEngineConfig = Required<
  Pick<
    ContentEngineConfig,
    | "assetPriority"
    | "preferredProviders"
    | "brandingProfile"
    | "allowFallbacks"
    | "maximumAIAssets"
    | "reuseThreshold"
  >
> &
  ContentEngineConfig & {
    cachePolicy: import("./asset-package.js").AssetCachePolicy;
  };

/** Resolved config with Phase 5 render-engine defaults applied. */
export type ResolvedRenderEngineConfig = Required<
  Pick<
    ContentEngineConfig,
    | "renderer"
    | "preferredRenderer"
    | "fps"
    | "bitrate"
    | "codec"
    | "audioCodec"
    | "outputDirectory"
    | "hardwareAcceleration"
    | "subtitleMode"
    | "watermark"
    | "outputContainer"
  >
> &
  ContentEngineConfig;

/** Resolved config with Phase 6 publishing defaults applied. */
export type ResolvedPublishingConfig = Required<
  Pick<
    ContentEngineConfig,
    | "publishingProvider"
    | "defaultVisibility"
    | "playlist"
    | "uploadRetries"
    | "notificationChannels"
    | "categoryId"
    | "license"
    | "madeForKids"
    | "retryBaseDelayMs"
    | "retryMaxDelayMs"
    | "deadLetterEnabled"
  >
> &
  ContentEngineConfig & {
    schedulePolicy: import("./published-video.js").SchedulePolicy;
  };

/** Resolved config with Phase 7 workflow defaults applied. */
export type ResolvedWorkflowConfig = Required<
  Pick<
    ContentEngineConfig,
    | "workflowConcurrency"
    | "maximumRetries"
    | "resumeOnFailure"
    | "dailyVideoCount"
    | "parallelRendering"
    | "queueMode"
    | "retryBaseDelayMs"
    | "retryMaxDelayMs"
    | "timezone"
  >
> &
  ContentEngineConfig & {
    notificationPolicy: import("./workflow.js").WorkflowNotificationPolicy;
  };

/** Resolved config with Phase 8 analytics defaults applied. */
export type ResolvedAnalyticsConfig = Required<
  Pick<
    ContentEngineConfig,
    | "analyticsProvider"
    | "reportSchedule"
    | "minimumSampleSize"
    | "learningRetentionDays"
    | "optimizationEnabled"
  >
> &
  ContentEngineConfig;

/** Resolved config with Phase 9 brain defaults applied. */
export type ResolvedBrainConfig = Required<
  Pick<
    ContentEngineConfig,
    | "campaignPlanningEnabled"
    | "optimizationEnabled"
    | "trendProvider"
    | "seasonalCalendar"
    | "abTestingEnabled"
    | "predictionEnabled"
    | "learningWindowDays"
    | "confidenceThreshold"
  >
> &
  ContentEngineConfig;

/** Resolved config with Phase 10 operations defaults applied. */
export type ResolvedOpsConfig = Required<
  Pick<
    ContentEngineConfig,
    | "runtimeEnvironment"
    | "opsLogLevel"
    | "dataDirectory"
    | "backupDirectory"
    | "healthcheckEnabled"
    | "monitoringEnabled"
    | "backupEnabled"
    | "opsNotificationsEnabled"
    | "opsNotificationChannels"
    | "schedulerBackend"
    | "dailyCron"
    | "minimumDiskFreeMb"
    | "maximumMemoryUsagePercent"
    | "secretValidationMode"
    | "correlationHeader"
  >
> &
  ContentEngineConfig;

export type {
  AudioCodec,
  AudioMixPlan,
  AudioTrackSpec,
  CompositionPlan,
  FrameTimeline,
  FrameTimelineClip,
  HardwareAcceleration,
  OutputContainer,
  RenderEngineSettings,
  RenderExportFormat,
  RenderExportResult,
  RenderInput,
  RenderJobRequest,
  RenderJobResult,
  RenderMetadata,
  RenderPackage,
  RenderProgressEvent,
  RenderProgressStage,
  RenderProviderHealth,
  RenderProviderId,
  RenderTelemetry,
  RenderTimeEstimate,
  RenderValidationIssue,
  RenderValidationReport,
  SubtitleCue,
  SubtitleMode,
  SubtitlePlan,
  TransitionSpec,
  VideoCodec,
  VisualLayer,
  VisualSourceKind,
  WatermarkSpec,
} from "./render-package.js";

export { RENDER_PACKAGE_VERSION } from "./render-package.js";

export type {
  AuditAction,
  AuditLogEntry,
  DeadLetterRecord,
  NotificationChannel,
  NotificationDelivery,
  NotificationEventKind,
  NotificationPayload,
  PersistedPublishRecord,
  PublishMetadata,
  PublishMetadataOverrides,
  PublishRequest,
  PublishVerificationReport,
  PublishedExportFormat,
  PublishedExportResult,
  PublishedVideo,
  PublishingEngineSettings,
  PublishingErrorCode,
  PublishingInput,
  PublishingProviderHealth,
  PublishingProviderId,
  PublishingTelemetry,
  RetryAttempt,
  ScheduleMode,
  SchedulePlan,
  SchedulePolicy,
  ScheduleRequest,
  ThumbnailResolution,
  UpdateRequest,
  UploadRequest,
  UploadResult,
  VerifyRequest,
  VideoVisibility,
  YouTubeProviderSettings,
} from "./published-video.js";

export { PUBLISHED_VIDEO_VERSION } from "./published-video.js";

export type {
  CheckpointName,
  PersistedWorkflowState,
  PhaseTiming,
  QueueJob,
  QueueMode,
  WorkflowCheckpoint,
  WorkflowEngineSettings,
  WorkflowEvent,
  WorkflowEventKind,
  WorkflowExecutionReport,
  WorkflowExportFormat,
  WorkflowExportResult,
  WorkflowJobRequest,
  WorkflowJobType,
  WorkflowNotificationKind,
  WorkflowNotificationPolicy,
  WorkflowPhase,
  WorkflowResult,
  WorkflowStatus,
  WorkflowTelemetry,
  WorkflowTrigger,
  WorkflowVideoArtifacts,
  WorkflowVideoUnit,
} from "./workflow.js";

export { WORKFLOW_RESULT_VERSION } from "./workflow.js";

export type {
  AnalyticsEngineSettings,
  AnalyticsExportFormat,
  AnalyticsExportResult,
  AnalyticsInput,
  AnalyticsProviderHealth,
  AnalyticsProviderId,
  AnalyticsReport,
  AnalyticsTelemetry,
  AudiencePreference,
  CategoryTrend,
  ChannelAnalyticsSummary,
  ChannelPerformanceMetrics,
  CollectRequest,
  CollectResult,
  ContentScore,
  ContentScoreBreakdown,
  DeviceType,
  GrowthRecommendation,
  LearningRecord,
  LearningStoreSnapshot,
  OptimizationSignal,
  PeriodReport,
  PublishTimeEffectiveness,
  RecommendationKind,
  ReportSchedule,
  SeasonalSpike,
  ShortsPerformanceMetrics,
  TopicScore,
  TopicScoreBreakdown,
  TopicTrend,
  TrafficSource,
  TrendReport,
  VideoAnalyticsSummary,
  VideoPerformanceMetrics,
} from "./analytics.js";

export { ANALYTICS_REPORT_VERSION } from "./analytics.js";

export type {
  BrainEngineSettings,
  BrainInput,
  BrainRecommendation,
  BrainTelemetry,
  CampaignExportFormat,
  CampaignExportResult,
  CampaignPlan,
  CampaignSeriesKind,
  CampaignSeriesPlan,
  CampaignSlot,
  ContentMemorySnapshot,
  ExperimentDefinition,
  ExperimentResult,
  ExperimentVariable,
  OptimizationDecision,
  PerformancePrediction,
  RankedItem,
  SeasonalEvent,
  SeasonalEventKind,
  TrendProviderHealth,
  TrendProviderId,
  TrendSignal,
} from "./campaign-plan.js";

export { CAMPAIGN_PLAN_VERSION } from "./campaign-plan.js";

export type {
  AcceptanceScenarioResult,
  BackupManifest,
  BootstrapReport,
  BootstrapStepResult,
  DiagnosticReport,
  HealthCheckName,
  HealthCheckResult,
  HealthReport,
  HealthStatus,
  OperationsEngineSettings,
  OperationsExportResult,
  OperationsRuntimeState,
  OpsLogLevel,
  OpsNotificationChannel,
  OpsNotificationDelivery,
  OpsNotificationEvent,
  OpsNotificationPayload,
  OpsSchedulerBackend,
  OpsTelemetry,
  ProductionValidationReport,
  RecoveryPlan,
  RestoreResult,
  RuntimeEnvironment,
  RuntimeMetrics,
  ScheduledOpsJob,
  SecretDiagnostic,
  SecretName,
  SecretsReport,
  StructuredLogRecord,
} from "./operations.js";

export { OPERATIONS_REPORT_VERSION } from "./operations.js";
