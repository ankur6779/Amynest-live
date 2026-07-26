export {
  DEVELOPMENT_ENGINE_VERSION,
  DEVELOPMENT_DOMAINS,
  type DevelopmentDomain,
  type DevelopmentSnapshot,
  type DevelopmentEngineInput,
  type AgeStage,
  type AgeStageId,
  type ParentGoalId,
  type RoutineInput,
  type RoutineKind,
  type DomainScore,
  type PriorityArea,
  type RoutineAlignment,
} from "./types.js";

export {
  ageMonthsFromBirthDate,
  resolveAgeStage,
  stageIdForAgeMonths,
  listAgeStages,
} from "./age-stages.js";

export {
  DevelopmentEngine,
  getDevelopmentEngine,
  computeDevelopmentSnapshot,
} from "./engine.js";

export { evaluateRoutines } from "./routines.js";
export { buildDomainScores } from "./domains.js";
export { rankPriorityAreas, buildRecommendations } from "./priorities.js";
