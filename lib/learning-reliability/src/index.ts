export {
  LEARNING_RELIABILITY_SCHEMA_VERSION,
  type DataLossRisk,
  type FailureKind,
  type VerifyDomain,
  type RepairActionLog,
  type ScenarioStatus,
  type ScenarioResult,
  type FailureMatrixRow,
  type ReliabilityReport,
  type ChaosContext,
} from "./types.js";

export {
  createPlatformHarness,
  baselinePlay,
  type PlatformHarness,
} from "./harness.js";

export {
  verifyAll,
  verifyKnowledgeGraph,
  verifySkillRegistry,
  verifyLearningRuntime,
  verifyEventOrdering,
  verifyOfflineQueue,
  verifyDecisionReplay,
  verifyRecommendationStability,
  verifyCloudReconciliationReadiness,
  type CheckResult,
} from "./verify.js";

export {
  healCorruptKnowledgeGraph,
  healMissingNodes,
  healOfflineQueue,
  healStaleDecisions,
  healPlatform,
  sanitizeEventInput,
} from "./heal.js";

export {
  SCENARIO_REGISTRY,
  ALL_SCENARIO_RUNNERS,
  scenarioAppKill,
  scenarioBrowserRefresh,
  scenarioTabCrash,
  scenarioStorageCorruption,
  scenarioPartialWrites,
  scenarioDuplicateEvents,
  scenarioMissingEvents,
  scenarioDelayedEvents,
  scenarioOfflineHours,
  scenarioReconnectStorms,
  scenarioLowMemory,
  scenarioSlowCpu,
  scenarioBatterySaver,
  scenarioAudioInterruption,
  scenarioRouteInterruption,
} from "./scenarios.js";

export {
  buildFailureMatrix,
  computeReliabilityScore,
  buildReliabilityReport,
} from "./score.js";

export {
  runLearningChaosSuite,
  formatReliabilityReport,
  type ChaosSuiteOptions,
} from "./run.js";
