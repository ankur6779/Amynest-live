/**
 * Today Hero Activation Gate (Sprint A9.4).
 * Mission Hero only. Everything else stays Legacy.
 */

export {
  AMY_TODAY_HERO_ACTIVATION_VERSION,
  type TodayActivationHealth,
  type TodayHeroActivationInput,
  type TodayHeroActivationOptions,
  type TodayHeroActivationReason,
  type TodayHeroActivationResult,
  type TodayHeroSource,
} from "./types";

export { evaluateTodayHeroActivation } from "./evaluate";
export {
  forceLegacyHero,
  getTodayHeroSource,
  isBrainHeroActive,
} from "./api";
export { getTodayActivationHealth } from "./health";
export {
  clearForceLegacyHeroForTests,
  clearTodayHeroActivationStateForTests,
  getLastHeroActivation,
} from "./health-state";
export { isAmyTodayBrainHeroEnabled } from "./flags";
