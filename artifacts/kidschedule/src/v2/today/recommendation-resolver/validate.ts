/**
 * validateRenderableRecommendation — shape + known-card checks.
 * Never renders. Never imports React.
 */

import { ALL_KNOWN_CARD_ID_SET } from "./cards";
import {
  AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION,
  AMY_TODAY_RENDER_VERSION,
  type RenderableRecommendationValidationResult,
  type TodayRenderableRecommendation,
} from "./types";

function assertKnownOrNull(
  id: string | null | undefined,
  path: string,
  issues: { path: string; message: string }[],
): void {
  if (id == null) return;
  if (!ALL_KNOWN_CARD_ID_SET.has(id)) {
    issues.push({ path, message: `unknown Today card id: ${id}` });
  }
}

export function validateRenderableRecommendation(
  value: unknown,
): RenderableRecommendationValidationResult {
  const issues: { path: string; message: string }[] = [];

  if (!value || typeof value !== "object") {
    return Object.freeze({
      ok: false,
      issues: Object.freeze([{ path: "", message: "must be an object" }]),
    });
  }

  const r = value as Partial<TodayRenderableRecommendation>;

  if (r.resolverVersion !== AMY_TODAY_RECOMMENDATION_RESOLVER_VERSION) {
    issues.push({ path: "resolverVersion", message: "unexpected version" });
  }
  if (r.renderVersion !== AMY_TODAY_RENDER_VERSION) {
    issues.push({ path: "renderVersion", message: "unexpected version" });
  }
  if (typeof r.generatedAt !== "string" || !r.generatedAt) {
    issues.push({ path: "generatedAt", message: "required" });
  }
  if (typeof r.legacyFallback !== "boolean") {
    issues.push({ path: "legacyFallback", message: "required boolean" });
  }
  if (!Array.isArray(r.secondaryCardIds)) {
    issues.push({ path: "secondaryCardIds", message: "required array" });
  }
  if (!Array.isArray(r.passiveCardIds)) {
    issues.push({ path: "passiveCardIds", message: "required array" });
  }
  if (!Array.isArray(r.ctaIds)) {
    issues.push({ path: "ctaIds", message: "required array" });
  }
  if (!Array.isArray(r.priority)) {
    issues.push({ path: "priority", message: "required array" });
  }
  if (!Array.isArray(r.missingCards)) {
    issues.push({ path: "missingCards", message: "required array" });
  }

  assertKnownOrNull(r.heroCardId ?? null, "heroCardId", issues);
  for (const [i, id] of (r.secondaryCardIds ?? []).entries()) {
    assertKnownOrNull(id, `secondaryCardIds[${i}]`, issues);
  }
  for (const [i, id] of (r.passiveCardIds ?? []).entries()) {
    assertKnownOrNull(id, `passiveCardIds[${i}]`, issues);
  }

  if (r.legacyFallback) {
    if (r.heroCardId != null || (r.secondaryCardIds?.length ?? 0) > 0) {
      issues.push({
        path: "legacyFallback",
        message: "fallback must not carry resolved cards",
      });
    }
  }

  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
