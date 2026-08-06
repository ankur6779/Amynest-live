/**
 * Developer APIs for Controlled Hero Activation.
 */

import { evaluateTodayHeroActivation } from "./evaluate";
import {
  forceLegacyHero as forceLegacyHeroImpl,
  getLastHeroActivation,
  getLastHeroSource,
  isForceLegacyHero,
} from "./health-state";
import type {
  TodayHeroActivationInput,
  TodayHeroActivationOptions,
  TodayHeroSource,
} from "./types";

/** True only when Mission Hero is Brain-controlled. */
export function isBrainHeroActive(
  input?: TodayHeroActivationInput,
  options?: TodayHeroActivationOptions,
): boolean {
  if (isForceLegacyHero()) return false;
  if (input) {
    return evaluateTodayHeroActivation(input, options).active;
  }
  return getLastHeroActivation()?.active === true;
}

/** Current hero source — "brain" | "legacy". Defaults legacy. */
export function getTodayHeroSource(
  input?: TodayHeroActivationInput,
  options?: TodayHeroActivationOptions,
): TodayHeroSource {
  if (isForceLegacyHero()) return "legacy";
  if (input) {
    return evaluateTodayHeroActivation(input, options).source;
  }
  return getLastHeroSource();
}

/**
 * Rollback: force Legacy Hero for this process.
 * Single flag OFF also returns Today to Legacy (no migration).
 */
export function forceLegacyHero(): void {
  forceLegacyHeroImpl();
}
