export {
  AnalyticsOrchestrator,
  type AnalyticsOrchestrationResult,
  type AnalyticsOrchestratorOptions,
} from "./orchestrator.js";
export {
  AnalyticsProviderRegistry,
  FutureAnalyticsProvider,
  MockAnalyticsProvider,
  YouTubeAnalyticsProvider,
  createDefaultAnalyticsRegistry,
  type AnalyticsProvider,
  type AnalyticsProviderRegistryOptions,
  type MockAnalyticsProviderOptions,
  type YouTubeAnalyticsProviderOptions,
} from "./providers/index.js";
export { collectAnalytics } from "./collector/index.js";
export {
  aggregateVideoMetrics,
  mergeChannelWithAggregate,
  rankVideosByViews,
  type AggregatedVideoMetrics,
} from "./metrics/index.js";
export {
  scoreContent,
  scoreTopic,
  type ContentScoreInput,
  type TopicScoreInput,
} from "./scoring/index.js";
export {
  buildOptimizationSignals,
  buildRecommendations,
} from "./recommendations/index.js";
export {
  buildLearningSnapshot,
  preferredCategoriesFromLearning,
} from "./learning/index.js";
export { detectTrends, type TrendInputVideo } from "./trends/index.js";
export {
  buildChannelSummary,
  buildPeriodReport,
  buildVideoSummaries,
} from "./reporting/index.js";
export {
  InMemoryAnalyticsStore,
  type AnalyticsPersistenceStore,
} from "./persistence/index.js";
export { buildAnalyticsTelemetry } from "./telemetry/index.js";
export {
  analyticsReportToYaml,
  exportAnalyticsReport,
} from "./export/index.js";
