/** ISO 3166-1 alpha-2 country codes supported by the content orchestration layer. */
export type CountryCode = "IN" | "US" | "UK" | "AU" | "NZ" | "CA" | "AE" | "BD";

export type AgeBand = "0_24" | "24_36" | "36_48" | "48_72";

export type DevelopmentStage = "infant" | "toddler" | "preschooler";

export type ModuleId =
  | "phonics"
  | "motor_skills"
  | "social_emotional"
  | "language"
  | "cognitive"
  | "creativity"
  | "stories"
  | "puzzles";

export type CompletionStatus = "started" | "completed" | "skipped" | "abandoned";

export type DifficultyLevel = "easy" | "medium" | "hard";

export type VariationFlag = "speed_slow" | "speed_fast" | "voice_alt" | "order_shuffled";

/** Per-country learning expectation overrides (remotely editable via CMS/Firebase). */
export type CountryAgeOverride = {
  phonicsStart?: number;
  motorSkillsStart?: number;
  socialStart?: number;
  /** Shift age-band boundaries by N months (positive = later). */
  ageBandOffsetMonths?: number;
};

export type CountryAgeConfig = Record<CountryCode, CountryAgeOverride>;

export type GlobalAgeDefaults = {
  phonicsStart: number;
  motorSkillsStart: number;
  socialStart: number;
  ageBands: readonly { minMonths: number; maxMonths: number; band: AgeBand; stage: DevelopmentStage }[];
};

export type ModuleConfig = {
  moduleId: ModuleId;
  minAgeMonths: number;
  maxAgeMonths: number;
  countriesAllowed: CountryCode[] | "*";
  priorityScore: number;
  /** Development stages this module targets; empty = all stages in age range. */
  developmentStages?: DevelopmentStage[];
  freemiumPreviewCount?: number;
};

export type ContentHistoryEntry = {
  childId: string;
  contentId: string;
  moduleId: ModuleId;
  lastSeenAt: string;
  seenCount: number;
  completionStatus: CompletionStatus;
  engagementScore?: number;
};

export type ContentVariant = {
  variantId: string;
  speed?: "slow" | "normal" | "fast";
  voiceId?: string;
  orderSeed?: number;
};

export type PoolContentItem = {
  contentId: string;
  title: string;
  templateId?: string;
  difficultyLevel: DifficultyLevel;
  engagementWeight: number;
  variants: ContentVariant[];
};

export type ContentPool = {
  moduleId: ModuleId;
  ageBand: AgeBand;
  country: CountryCode | "GLOBAL";
  difficultyLevel: DifficultyLevel;
  contentVariants: PoolContentItem[];
};

export type AntiRepetitionConfig = {
  recentWindowDaysMin: number;
  recentWindowDaysMax: number;
  maxSeenCountBeforeExclude: number;
  newContentRatio: number;
  familiarContentRatio: number;
};

export type DailyPlanModule = {
  moduleId: ModuleId;
  eligible: boolean;
  locked: boolean;
  previewOnly: boolean;
  contentIds: string[];
  variationFlags?: VariationFlag[];
};

export type DailyPlan = {
  childId: string;
  date: string;
  countryCode: CountryCode;
  ageInMonths: number;
  ageBand: AgeBand;
  developmentStage: DevelopmentStage;
  modules: DailyPlanModule[];
  contentIds: string[];
  generatedAt: string;
  cacheKey: string;
  offlineFallback?: boolean;
};

export type AgeEngineInput = {
  childDOB: string | Date;
  countryCode: CountryCode;
  referenceDate?: Date;
};

export type AgeEngineOutput = {
  ageInMonths: number;
  ageBand: AgeBand;
  developmentStage: DevelopmentStage;
  countryCode: CountryCode;
  countryOverrides: CountryAgeOverride;
  effectivePhonicsStart: number;
};

export type ContentSelectionContext = {
  childId: string;
  moduleId: ModuleId;
  ageBand: AgeBand;
  countryCode: CountryCode;
  count: number;
  history: ContentHistoryEntry[];
  pool: ContentPool[];
  antiRepetition: AntiRepetitionConfig;
  referenceDate?: Date;
  allowReuseWithVariation?: boolean;
};

export type SelectedContent = {
  contentId: string;
  moduleId: ModuleId;
  isNew: boolean;
  seenCount: number;
  variationFlags: VariationFlag[];
  engagementWeight: number;
};

export type AnalyticsEventType =
  | "content_shown"
  | "content_completed"
  | "content_skipped"
  | "session_drop_off"
  | "pool_exhausted"
  | "offline_fallback_used";

export type AnalyticsEvent = {
  type: AnalyticsEventType;
  childId: string;
  moduleId: ModuleId;
  contentId: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type AnalyticsSnapshot = {
  contentFatigueRate: number;
  repeatExposurePct: number;
  engagementByModule: Record<ModuleId, number>;
  dropOffAfterRepetition: number;
};

export type CacheAdapter = {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
};

export type RemoteConfigProvider = {
  getCountryAgeConfig(): Promise<CountryAgeConfig | null>;
  getModuleConfigs(): Promise<ModuleConfig[] | null>;
  getAntiRepetitionConfig(): Promise<AntiRepetitionConfig | null>;
};
