export {
  KNOWLEDGE_GRAPH_VERSION,
  type ConceptNodeKind,
  type ConceptEdgeKind,
  type LearningSource,
  type LearningModality,
  type ReviewOutcome,
  type ReviewEvent,
  type NodeLearningState,
  type ConceptNode,
  type ConceptEdge,
  type KnowledgeGraphDocument,
  type LearningObservation,
  type RecommendationReason,
  type ConceptRecommendation,
  type KnowledgeGraphPersistence,
  type KnowledgeGraphSummary,
} from "./types.js";

export {
  REVIEW_HISTORY_CAP,
  FORGOTTEN_IDLE_DAYS,
  CONFIDENCE,
  edgeId,
  nodeId,
  phonemeId,
  entityId,
  habitatId,
  categoryId,
  soundConceptId,
  wordId,
  clampConfidence,
} from "./ontology.js";

export {
  createDefaultLearningState,
  applyObservationToState,
  refreshForgottenFlag,
  isStruggling,
  isKnown,
} from "./state.js";

export {
  createEmptyDocument,
  upsertNode,
  upsertEdge,
  buildAdjacency,
  neighbors,
  getState,
  cloneDocument,
} from "./graph.js";

export { recommendConcepts, type RecommendOptions } from "./recommendations.js";

export {
  SEED_CATALOG_VERSION,
  buildSeedDocument,
  mergeSeedIntoDocument,
  animalToSeedEntity,
  ensureStoryLearningStructure,
  ensureReadingLearningStructure,
  ensureGameLearningStructure,
  type StoryConceptSeedInput,
  type ReadingConceptSeedInput,
  type GameConceptSeedInput,
  type SeedEntityInput,
} from "./seed-catalog.js";

export {
  createKnowledgeGraphApi,
  createMemoryPersistence,
  type KnowledgeGraphApi,
  type CreateKnowledgeGraphApiOptions,
  type KnowledgeGraphTelemetryEvent,
} from "./api.js";

export {
  observationsFromMasteryDelta,
  observationsFromMasteryMapDelta,
  observationsFromSpeechAttempt,
  type ItemMasteryLike,
} from "./world-progress-adapter.js";

export { summarizeKnowledgeGraph, getWeakPhonemes } from "./summary.js";

export {
  repairKnowledgeGraphDocument,
  type KnowledgeGraphRepairResult,
} from "./repair.js";
