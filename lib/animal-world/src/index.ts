export type {
  Animal,
  AnimalCategory,
  AnimalNarration,
  AnimalSound,
  AnimalWorldCatalog,
  AnimalWorldMode,
  AnimalWorldSessionStats,
  QuizAnswerResult,
  QuizQuestion,
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
  collectAnimalSoundUrls,
  collectCategoryPreloadUrls,
  getAllAnimals,
  getAnimalById,
  getAnimalSound,
  getAnimalWorldCatalog,
  getAnimalsByCategory,
  getPrimaryQuizSound,
  resolveAnimalAssetUrl,
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
  gradeQuizAnswer,
  type QuizEngineOptions,
} from "./quiz-engine.js";
