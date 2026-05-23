/**
 * Shared stability guards — cooldowns, action limits, log sampling, poll jitter.
 */

import { logger } from "../lib/logger.js";

export const ACTION_COOLDOWN_MS = Number(process.env.HEAL_ACTION_COOLDOWN_MS ?? 60_000);
export const MAX_ACTIONS_PER_WINDOW = 5;
export const ACTION_WINDOW_MS = 60_000;
export const POLL_JITTER_MS = 2_000;
export const LOG_SAMPLE_RATE = 0.2;

let lastActionAt = 0;
const actionTimestamps: number[] = [];

/** Predictive signals must confirm on 2 consecutive ticks. */
const pendingPredictiveSignals = new Map<string, number>();

export function canTriggerHealAction(now = Date.now()): boolean {
  if (lastActionAt > 0 && now - lastActionAt < ACTION_COOLDOWN_MS) return false;
  pruneActionWindow(now);
  return actionTimestamps.length < MAX_ACTIONS_PER_WINDOW;
}

export function recordHealAction(now = Date.now()): void {
  lastActionAt = now;
  actionTimestamps.push(now);
  pruneActionWindow(now);
}

/** Returns true if action is allowed and records it. */
export function tryHealAction(now = Date.now()): boolean {
  if (!canTriggerHealAction(now)) return false;
  recordHealAction(now);
  return true;
}

function pruneActionWindow(now: number): void {
  const cutoff = now - ACTION_WINDOW_MS;
  while (actionTimestamps.length > 0 && actionTimestamps[0]! < cutoff) {
    actionTimestamps.shift();
  }
}

export function isActionThrottled(now = Date.now()): boolean {
  pruneActionWindow(now);
  return !canTriggerHealAction(now);
}

/** Require 2 consecutive ticks where condition is true. */
export function confirmPredictiveSignal(key: string, condition: boolean): boolean {
  if (!condition) {
    pendingPredictiveSignals.delete(key);
    return false;
  }
  const next = (pendingPredictiveSignals.get(key) ?? 0) + 1;
  pendingPredictiveSignals.set(key, next);
  return next >= 2;
}

/** Recovery actions bypass cooldown but still respect the per-minute cap. */
export function tryHealRecoveryAction(now = Date.now()): boolean {
  pruneActionWindow(now);
  if (actionTimestamps.length >= MAX_ACTIONS_PER_WINDOW) return false;
  actionTimestamps.push(now);
  pruneActionWindow(now);
  return true;
}

export function jitteredIntervalMs(baseMs: number, now = Date.now()): number {
  const jitter = Math.floor(Math.random() * POLL_JITTER_MS);
  return baseMs + jitter;
}

export function scheduleJitteredInterval(
  baseMs: number,
  fn: () => void,
): ReturnType<typeof setInterval> {
  const tick = () => {
    fn();
    const next = jitteredIntervalMs(baseMs);
    timer = setTimeout(tick, next);
    timer.unref?.();
  };
  let timer = setTimeout(tick, jitteredIntervalMs(baseMs));
  timer.unref?.();
  return timer as unknown as ReturnType<typeof setInterval>;
}

type HealLogPayload = Record<string, unknown>;

/** Always logs failures, incidents, and heal actions; samples the rest at 20%. */
export function healLog(
  level: "info" | "warn" | "error",
  payload: HealLogPayload,
  message: string,
  options?: { always?: boolean },
): void {
  const always =
    options?.always === true ||
    payload.event === "self_heal_action" ||
    payload.event === "predictive_heal_action" ||
    payload.event === "service_crash" ||
    payload.event === "service_recovery" ||
    payload.type === "predicted_incident" ||
    payload.type === "incident" ||
    level === "error";

  if (!always && Math.random() > LOG_SAMPLE_RATE) return;

  if (level === "error") logger.error(payload, message);
  else if (level === "warn") logger.warn(payload, message);
  else logger.info(payload, message);
}

/** Test-only reset. */
export function resetHealStabilityGuardForTests(): void {
  lastActionAt = 0;
  actionTimestamps.length = 0;
  pendingPredictiveSignals.clear();
}
