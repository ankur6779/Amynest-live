export type {
  Animal,
  AnimalCategory,
  AnimalCollectionStatus,
  AnimalHeroVariant,
  AnimalMasteryRecord,
  AnimalNarration,
  AnimalSound,
  AnimalWorldCatalog,
  AnimalWorldMode,
  AnimalWorldProgressV2,
  AnimalWorldSessionStats,
  AchievementDefinition,
  AchievementMetric,
  AchievementProgress,
  ExplorerTier,
  HearFindAnswerResult,
  HearFindQuestion,
  ParentInsightsSnapshot,
  QuizAnswerResult,
  QuizQuestion,
  StickerDefinition,
  StickerUnlockRule,
} from "./types.js";

export {
  EXPLORER_TIER_XP,
} from "./types.js";

export {
  ANIMAL_CATEGORIES,
} from "./types.js";

export {
  ANIMAL_WORLD_GCS_OBJECT_PATH_RE,
  animalWorldLibraryProxyPath,
  getAnimalHeroImageGcsPath,
  getAnimalMetadataGcsPath,
  getAnimalSoundGcsPath,
  getAnimalWorldGcsPublicUrl,
  isValidAnimalWorldGcsObjectPath,
  sanitizeAnimalAssetId,
} from "./gcs-paths.js";

export {
  ANIMAL_WORLD_CATALOG_VERSION,
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  collectAdjacentAnimalUrls,
  collectAnimalSoundUrls,
  collectCategoryPreloadUrls,
  collectLikelyDiscoveryUrls,
  collectLikelyQuizSoundUrls,
  getAllAnimals,
  getAnimalById,
  getAnimalSound,
  getAnimalWorldCatalog,
  getAnimalsByCategory,
  getPrimaryQuizSound,
  resolveAnimalAssetUrl,
  resolveAnimalHeroImageUrl,
  resolveAnimalImageUrl,
  resolveAnimalSoundUrl,
} from "./catalog.js";

export {
  buildAnimalSoundEffectPrompt,
  collectAnimalWorldAudioJobs,
  type AnimalAudioJob,
  type AnimalAudioJobKind,
} from "./generation-prompts.js";

export {
  estimateMp3DurationMs,
  validateAnimalWorldMp3Buffer,
  type AnimalMp3Validation,
} from "./generation-quality.js";

export {
  buildDiscoverySequence,
  buildQuizQuestion,
  discoveryPhaseDurationMs,
  DISCOVERY_PHASE_ORDER,
  gradeQuizAnswer,
  type DiscoverySlidePhase,
  type QuizEngineOptions,
} from "./quiz-engine.js";

export {
  buildHearFindQuestion,
  gradeHearFindAnswer,
  hearFindAccuracyPct,
  type HearFindEngineOptions,
} from "./hear-find-engine.js";

export {
  XP_REWARDS,
  addXp,
  bumpMastery,
  countDiscoveredAnimals,
  countMasteredAnimals,
  defaultProgressV2,
  getAnimalMastery,
  resolveCollectionStatus,
  resolveExplorerTier,
} from "./collection.js";

export {
  ANIMAL_WORLD_ACHIEVEMENTS,
  computeAchievementProgress,
  mergeUnlockedAchievements,
  newlyUnlockedAchievements,
} from "./achievements.js";

export {
  buildStickerCatalog,
  earnEligibleStickers,
  isStickerUnlocked,
} from "./stickers.js";

export {
  buildParentInsights,
  type ParentInsightsInput,
} from "./parent-insights.js";

export {
  ANIMAL_WORLD_OFFLINE_CACHE_VERSION,
  buildOfflineManifest,
  OFFLINE_LIMITS,
  type OfflineAssetEntry,
} from "./offline-manifest.js";

export {
  ANIMAL_WORLD_MODES,
  FUTURE_WORLD_IDS,
  getAnimalWorldEngine,
} from "./world-config.js";
