/**
 * AmyNest V2 Product Analytics Emitters (Sprint 3C-4).
 * All tracks go through Analytics Core — never Firebase / Ads / RC directly.
 */

export {
  ensureProductAnalyticsReady,
  isProductAnalyticsFlagEnabled,
  resetProductAnalyticsBootstrapForTests,
} from "./bootstrap";
export type { ProductAnalyticsReadyInput } from "./bootstrap";

export {
  emitV2MissionStarted,
  emitV2MissionCompleted,
  emitV2WowCompletedIfEligible,
  emitV2D1ReturnedIfEligible,
  emitV2PracticeDay3IfEligible,
} from "./emitters";
export type {
  EmitMissionStartedInput,
  EmitMissionCompletedInput,
} from "./emitters";

export { markFrontDoorStarted, readDoorStartedAt, clearDoorStartedForTests } from "./door-start";
export {
  ensureCohortDay0,
  readCohortDay0,
  clearCohortDay0ForTests,
} from "./cohort";
export {
  clearPracticeLogForTests,
  countPracticesInDay3Window,
  recordPracticeCompletion,
} from "./practice-log";
export {
  clearProductAnalyticsIdentityForTests,
  resolveAnonymousId,
  resolveSessionId,
} from "./identity";
export {
  PRODUCT_JOURNEY_ID,
  PRODUCT_JOURNEY_VERSION,
  WOW_WINDOW_MS,
} from "./journey-meta";
export {
  addLocalDateDays,
  daysSinceCohortDay0,
  localDateKey,
} from "./dates";
