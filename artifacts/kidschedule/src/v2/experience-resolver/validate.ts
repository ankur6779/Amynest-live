/**
 * validateResolvedExperience — shape checks only.
 */

import { AMY_EXPERIENCE_RESOLVER_VERSION } from "./types";
import type {
  ResolvedExperience,
  ResolvedExperienceValidationResult,
} from "./types";

const TYPES = new Set([
  "speech",
  "sleep",
  "coach",
  "guide",
  "treasury",
  "unknown",
]);

const AVAIL = new Set([
  "available",
  "limited",
  "unavailable",
  "unknown",
]);

const PREMIUM = new Set([
  "none",
  "eligible",
  "locked",
  "unlocked",
  "supported",
  "unknown",
]);

export function validateResolvedExperience(
  value: unknown,
): ResolvedExperienceValidationResult {
  const issues: { path: string; message: string }[] = [];

  if (!value || typeof value !== "object") {
    return Object.freeze({
      ok: false,
      issues: Object.freeze([{ path: "", message: "must be an object" }]),
    });
  }

  const r = value as Partial<ResolvedExperience>;

  if (typeof r.experienceId !== "string" || !r.experienceId) {
    issues.push({ path: "experienceId", message: "required" });
  }
  if (!r.experienceType || !TYPES.has(r.experienceType)) {
    issues.push({ path: "experienceType", message: "invalid" });
  }
  if (typeof r.priority !== "number") {
    issues.push({ path: "priority", message: "required number" });
  }
  if (r.resolverVersion !== AMY_EXPERIENCE_RESOLVER_VERSION) {
    issues.push({ path: "resolverVersion", message: "unexpected version" });
  }
  if (typeof r.generatedAt !== "string" || !r.generatedAt) {
    issues.push({ path: "generatedAt", message: "required" });
  }
  if (typeof r.recommendedJourney !== "string") {
    issues.push({ path: "recommendedJourney", message: "required" });
  }
  if (!Array.isArray(r.recommendedToolIds)) {
    issues.push({ path: "recommendedToolIds", message: "required array" });
  }
  if (!Array.isArray(r.recommendedFeatureIds)) {
    issues.push({ path: "recommendedFeatureIds", message: "required array" });
  }
  if (!Array.isArray(r.recommendedRouteIds)) {
    issues.push({ path: "recommendedRouteIds", message: "required array" });
  }
  if (!r.availability || !AVAIL.has(r.availability)) {
    issues.push({ path: "availability", message: "invalid" });
  }
  if (!r.premiumState || !PREMIUM.has(r.premiumState)) {
    issues.push({ path: "premiumState", message: "invalid" });
  }
  if (typeof r.unknown !== "boolean") {
    issues.push({ path: "unknown", message: "required boolean" });
  }
  if (typeof r.missingContent !== "boolean") {
    issues.push({ path: "missingContent", message: "required boolean" });
  }
  if (r.unknown && r.experienceType !== "unknown") {
    issues.push({
      path: "experienceType",
      message: "unknown experiences must use experienceType unknown",
    });
  }
  if (!r.unknown && r.resolvedContentId == null && !r.missingContent) {
    issues.push({
      path: "missingContent",
      message: "null content requires missingContent true",
    });
  }

  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
