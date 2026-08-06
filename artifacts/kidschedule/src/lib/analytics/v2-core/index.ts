/**
 * AmyNest V2 Analytics Core Infrastructure (Sprint 3C-3).
 *
 * Single entry: `trackV2AnalyticsEvent` / `getV2AnalyticsBus().track`
 * No Firebase · No Google Ads · No RevenueCat · No product emitters.
 */

export {
  createV2AnalyticsBus,
  installV2AnalyticsBus,
  getV2AnalyticsBus,
  trackV2AnalyticsEvent,
  resetV2AnalyticsBusForTests,
} from "./bus";
export type { V2AnalyticsBus, V2AnalyticsBusOptions } from "./bus";

export {
  createV2AnalyticsContext,
  getActiveV2AnalyticsContext,
  setActiveV2AnalyticsContext,
  resetActiveV2AnalyticsContextForTests,
} from "./context";
export type { CreateV2AnalyticsContextInput } from "./context";

export {
  createOnceEngine,
  createMemoryOnceStore,
  createLocalStorageOnceStore,
  materializeOnceKey,
} from "./once-engine";
export type {
  OnceEngine,
  OnceStore,
  OnceStoreLifecycle,
  OnceKeyStore,
  OnceClaimResult,
} from "./once-engine";

export { validateV2Payload, FORBIDDEN_PII_PAYLOAD_KEYS } from "./payload-validator";

export {
  V2_ANALYTICS_REGISTRY,
  getRegistryEvent,
  listRegistryEventNames,
  assertOptimizeCardinality,
} from "./registry/events";
export { lookupRegistryEvent, validateRegistryIdentity } from "./registry/validate";

export { createSinkRegistry } from "./sinks/types";
export type { AnalyticsSink, SinkRegistry } from "./sinks/types";

export {
  createFirebaseSink,
  createFirebaseJsWriter,
  createMemoryFirebaseWriter,
  createNoopFirebaseOfflineQueue,
  isAllowedForFirebaseSink,
  listFirebaseSinkAllowlist,
  mapRegistryEventToFirebaseName,
  buildFirebaseParams,
  FIREBASE_SINK_ID,
  FIREBASE_GA4_NAME_BY_REGISTRY,
  FIREBASE_SINK_EXCLUDED_LAYERS,
} from "./sinks/firebase";
export type {
  FirebaseSink,
  FirebaseSinkWriteResult,
  FirebaseAnalyticsWriter,
  FirebaseAllowlistResult,
  OfflineFirebaseEnqueue,
} from "./sinks/firebase";

export {
  isV2AnalyticsDebugEnabled,
  setV2AnalyticsDebugEnabled,
  getV2AnalyticsDebugBuffer,
  clearV2AnalyticsDebugBuffer,
  resetV2AnalyticsDebugForTests,
} from "./debug";

export {
  getV2SinkHealth,
  recordV2SinkHealth,
  resetV2SinkHealthForTests,
} from "./sink-health";
export type { V2SinkHealthCounters, V2SinkHealthKind } from "./sink-health";

export type {
  V2AnalyticsContext,
  V2AnalyticsLayer,
  V2AnalyticsRecord,
  V2Platform,
  V2RegistryEventDefinition,
  V2TrackInput,
  V2TrackResult,
  V2TrackRejectionReason,
} from "./types";
export { V2_ANALYTICS_LAYERS } from "./types";
