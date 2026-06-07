export type {
  WorldAnalyticsEvent,
  WorldCatalogBase,
  WorldId,
  WorldItemBase,
  WorldModeDefinition,
  WorldProgressSnapshot,
} from "./types.js";

export { WORLD_IDS } from "./types.js";

export { WorldEngine, type WorldEngineOptions } from "./world-engine.js";

export type {
  WorldManifest,
  WorldManifestItem,
  WorldManifestNarration,
  WorldManifestSound,
} from "./manifest-types.js";

export {
  WORLD_GCS_FOLDER,
  WORLD_MANIFEST_FILE,
  buildWorldsLibraryPathRegex,
  getWorldItemAssetPath,
  getWorldManifestGcsPath,
  isValidWorldsLibraryObjectPath,
  sanitizeWorldAssetId,
  worldsLibraryProxyPath,
  WORLDS_LIBRARY_LOCAL_MIRROR_WEB_PREFIX,
  worldsLibraryLocalMirrorWebPath,
  extractWorldsLibraryObjectPath,
  worldsLibraryPlaybackCandidates,
} from "./gcs-layout.js";

export {
  INSTRUMENT_EXTRA_MODES,
  NATURE_EXTRA_MODES,
  STANDARD_WORLD_MODES,
  modesForWorld,
  type StandardWorldModeId,
} from "./standard-modes.js";

export {
  DISCOVERY_WORLDS_ANALYTICS_EVENTS,
  buildDiscoveryWorldsAnalyticsMeta,
  formatDiscoveryWorldsLogMessage,
  type DiscoveryWorldsAnalyticsEvent,
} from "./analytics-events.js";

export {
  PLATFORM_EXPLORER_TIER_XP,
  defaultWorldItemMastery,
  defaultWorldProgressV2,
  resolvePlatformExplorerTier,
  type ExplorerTier,
  type WorldItemMastery,
  type WorldProgressV2,
} from "./progress-types.js";

export { PLATFORM_XP_REWARDS, addPlatformXp, type PlatformXpKind } from "./reward-system.js";

export {
  PLATFORM_WORLD_ACHIEVEMENTS,
  computePlatformAchievements,
  mergePlatformAchievements,
  type PlatformAchievementDefinition,
  type PlatformAchievementProgress,
} from "./achievement-engine.js";

export {
  buildPlatformStickerCatalog,
  earnPlatformStickers,
  isPlatformStickerUnlocked,
  type PlatformStickerDefinition,
} from "./sticker-engine.js";

export {
  PLATFORM_OFFLINE_CACHE_VERSION,
  PLATFORM_OFFLINE_LIMITS,
  buildPlatformOfflineManifest,
  platformOfflineCacheStorageKey,
  platformProgressStorageKey,
  type PlatformOfflineEntry,
  type OfflineCacheBuildInput,
} from "./offline-cache.js";

export {
  buildPlatformHearFindQuestion,
  gradePlatformHearFind,
  getPrimarySound,
  type HearFindQuestion,
  type HearFindOption,
} from "./hear-find.js";

export {
  DISCOVERY_PHASE_ORDER,
  buildPlatformDiscoverySequence,
  discoveryPhaseDurationMs,
  type DiscoverySlidePhase,
} from "./discovery.js";

export {
  DISCOVERY_WORLDS_REGISTRY,
  getDiscoveryWorldDefinition,
  getLiveDiscoveryWorlds,
  getPreviewDiscoveryWorlds,
  modeIdsForWorld,
  type DiscoveryWorldDefinition,
} from "./registry.js";

export { buildPlatformParentInsights, type PlatformParentInsights } from "./parent-insights.js";

export {
  buildDailyAdventure,
  loadDailyAdventureProgress,
  recordDailyAdventureEvent,
  dailyAdventureCompletionPct,
  type DailyAdventureTask,
  type DailyAdventureProgress,
  type DailyAdventureTaskKind,
  type DailyAdventureCompletion,
} from "./daily-adventures.js";

export {
  EXPLORER_LEVEL_LADDER,
  resolveExplorerLevel,
  nextExplorerLevel,
  xpProgressToNextLevel,
  type ExplorerLevelTitle,
} from "./explorer-levels.js";

export {
  STREAK_BADGES,
  unlockedStreakBadges,
  nextStreakBadge,
  type StreakBadgeDefinition,
  type StreakBadgeId,
} from "./streak-badges.js";

export {
  buildPersonalizedRecommendation,
  type PersonalizedRecommendation,
} from "./personalization.js";

export {
  diagnoseWorldManifest,
  manifestDiagnosticsSummary,
  type ContentDiagnosticIssue,
} from "./content-diagnostics.js";

export {
  buildAssetCoverageReport,
  expectedVisualAssetsForItem,
  expectedVisualAssetsForManifest,
  type AssetCoverageReport,
  type ExpectedVisualAsset,
  type VisualAssetKind,
  type WorldAssetCoverageRow,
} from "./asset-coverage.js";

export { itemAssetFolder } from "./visual-asset-paths.js";

export {
  buildWorldSoundEffectPrompt,
  collectWorldAudioJobs,
  type WorldAudioJob,
  type WorldAudioJobKind,
} from "./generation-prompts.js";
