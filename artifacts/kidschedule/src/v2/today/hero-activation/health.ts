import { getActivationHealthCounters } from "./health-state";
import {
  AMY_TODAY_HERO_ACTIVATION_VERSION,
  type TodayActivationHealth,
} from "./types";

export function getTodayActivationHealth(): TodayActivationHealth {
  const c = getActivationHealthCounters();
  return Object.freeze({
    brainHeroActivations: c.brainHeroActivations,
    legacyFallbacks: c.legacyFallbacks,
    resolverFailures: c.resolverFailures,
    validationFailures: c.validationFailures,
    activationVersion: AMY_TODAY_HERO_ACTIVATION_VERSION,
  });
}
