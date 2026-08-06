import { AMY_DECISION_BRIDGE_VERSION } from "./types";
import type {
  ResolvedDecision,
  ResolvedDecisionValidationResult,
} from "./types";

function validateProvenance(
  value: unknown,
  path: string,
  issues: { path: string; message: string }[],
): void {
  if (!value || typeof value !== "object") {
    issues.push({ path, message: "required object" });
    return;
  }
  const p = value as Record<string, unknown>;
  if (p.resolvedByBridgeVersion !== AMY_DECISION_BRIDGE_VERSION) {
    issues.push({
      path: `${path}.resolvedByBridgeVersion`,
      message: "unexpected version",
    });
  }
  if (typeof p.adapterVersion !== "string" || !p.adapterVersion) {
    issues.push({ path: `${path}.adapterVersion`, message: "required" });
  }
  if (typeof p.brainDecisionVersion !== "string" || !p.brainDecisionVersion) {
    issues.push({ path: `${path}.brainDecisionVersion`, message: "required" });
  }
  if (typeof p.resolvedAt !== "string" || !p.resolvedAt) {
    issues.push({ path: `${path}.resolvedAt`, message: "required" });
  }
}

/**
 * Validate ResolvedDecision shape — no execution rules.
 */
export function validateResolvedDecision(
  value: unknown,
): ResolvedDecisionValidationResult {
  const issues: { path: string; message: string }[] = [];
  if (!value || typeof value !== "object") {
    return Object.freeze({
      ok: false,
      issues: Object.freeze([{ path: "", message: "must be an object" }]),
    });
  }
  const r = value as Partial<ResolvedDecision>;

  if (typeof r.decisionId !== "string" || !r.decisionId) {
    issues.push({ path: "decisionId", message: "required" });
  }
  if (r.stabilityToken != null && typeof r.stabilityToken !== "string") {
    issues.push({ path: "stabilityToken", message: "string or null" });
  }
  if (r.bridgeVersion !== AMY_DECISION_BRIDGE_VERSION) {
    issues.push({ path: "bridgeVersion", message: "unexpected version" });
  }
  if (typeof r.resolvedAt !== "string") {
    issues.push({ path: "resolvedAt", message: "required" });
  }
  if (!Array.isArray(r.resolvedFeatures)) {
    issues.push({ path: "resolvedFeatures", message: "required array" });
  }
  if (!Array.isArray(r.resolvedTools)) {
    issues.push({ path: "resolvedTools", message: "required array" });
  }
  if (!Array.isArray(r.resolvedRoutes)) {
    issues.push({ path: "resolvedRoutes", message: "required array" });
  }
  if (!Array.isArray(r.missingReferences)) {
    issues.push({ path: "missingReferences", message: "required array" });
  }

  validateProvenance(r.provenance, "provenance", issues);

  if (
    !r.resolutionTrace ||
    typeof r.resolutionTrace !== "object" ||
    (r.resolutionTrace as { kind?: string }).kind !==
      "amy_decision_resolution_trace.v1" ||
    !Array.isArray((r.resolutionTrace as { steps?: unknown }).steps)
  ) {
    issues.push({
      path: "resolutionTrace",
      message: "required amy_decision_resolution_trace.v1",
    });
  }

  for (const slot of ["hero", "secondary", "passive"] as const) {
    const s = r[slot];
    if (s == null) continue;
    if (typeof s !== "object") {
      issues.push({ path: slot, message: "object or null" });
      continue;
    }
    validateProvenance(
      (s as { provenance?: unknown }).provenance,
      `${slot}.provenance`,
      issues,
    );
  }

  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
