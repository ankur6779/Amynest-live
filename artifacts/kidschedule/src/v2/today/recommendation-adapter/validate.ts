/**
 * validateTodayRecommendation — shape checks only.
 * Never executes Brain. Never changes Today UI.
 */

import { AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION } from "./types";
import type {
  TodayRecommendation,
  TodayRecommendationValidationResult,
} from "./types";

const STATES = new Set([
  "LEGACY_ONLY",
  "BRAIN_AVAILABLE",
  "BRAIN_VALIDATED",
  "BRAIN_UNAVAILABLE",
]);

export function validateTodayRecommendation(
  value: unknown,
): TodayRecommendationValidationResult {
  const issues: { path: string; message: string }[] = [];

  if (!value || typeof value !== "object") {
    return Object.freeze({
      ok: false,
      issues: Object.freeze([{ path: "", message: "must be an object" }]),
    });
  }

  const r = value as Partial<TodayRecommendation>;

  if (r.adapterVersion !== AMY_TODAY_RECOMMENDATION_ADAPTER_VERSION) {
    issues.push({ path: "adapterVersion", message: "unexpected version" });
  }
  if (typeof r.generatedAt !== "string" || !r.generatedAt) {
    issues.push({ path: "generatedAt", message: "required" });
  }
  if (!r.source || !STATES.has(r.source)) {
    issues.push({ path: "source", message: "invalid recommendation state" });
  }
  if (typeof r.recommendationConfidence !== "string") {
    issues.push({ path: "recommendationConfidence", message: "required" });
  }

  const fallback =
    r.source === "LEGACY_ONLY" || r.source === "BRAIN_UNAVAILABLE";
  if (fallback) {
    if (r.heroRecommendation != null) {
      issues.push({
        path: "heroRecommendation",
        message: "must be null for fallback states",
      });
    }
  } else if (
    r.source === "BRAIN_VALIDATED" ||
    r.source === "BRAIN_AVAILABLE"
  ) {
    // Hero may still be null if Brain allocated empty — allowed.
  }

  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
