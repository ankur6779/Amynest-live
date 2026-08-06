/**
 * validateTodayBrain — snapshot shape checks only.
 * Never executes Brain. Never changes Today UI.
 */

import { AMY_TODAY_BRAIN_ADAPTER_VERSION } from "./types";
import type {
  TodayBrainSnapshot,
  TodayBrainValidationResult,
} from "./types";

export function validateTodayBrain(
  snapshot: unknown,
): TodayBrainValidationResult {
  const issues: { path: string; message: string }[] = [];

  if (!snapshot || typeof snapshot !== "object") {
    return Object.freeze({
      ok: false,
      issues: Object.freeze([{ path: "", message: "must be an object" }]),
    });
  }

  const s = snapshot as Partial<TodayBrainSnapshot>;

  if (typeof s.brainAvailable !== "boolean") {
    issues.push({ path: "brainAvailable", message: "required boolean" });
  }
  if (typeof s.validationPassed !== "boolean") {
    issues.push({ path: "validationPassed", message: "required boolean" });
  }
  if (typeof s.generatedAt !== "string" || !s.generatedAt) {
    issues.push({ path: "generatedAt", message: "required" });
  }
  if (s.adapterVersion !== AMY_TODAY_BRAIN_ADAPTER_VERSION) {
    issues.push({ path: "adapterVersion", message: "unexpected version" });
  }
  if (s.brainAvailable) {
    if (s.brainVersion == null || typeof s.brainVersion !== "string") {
      issues.push({
        path: "brainVersion",
        message: "required when brainAvailable",
      });
    }
  } else if (s.resolvedHero != null || s.resolvedSecondary != null) {
    issues.push({
      path: "resolvedHero",
      message: "slots must be null when brain unavailable",
    });
  }

  if (s.validationPassed && !s.brainAvailable) {
    issues.push({
      path: "validationPassed",
      message: "cannot pass when brain unavailable",
    });
  }

  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
