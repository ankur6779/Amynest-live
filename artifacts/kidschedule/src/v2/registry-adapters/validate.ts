import { AMY_REGISTRY_ADAPTER_VERSION } from "./types";
import type {
  AdaptedFeature,
  AdaptedRoute,
  AdaptedTool,
  FeatureRegistrySnapshot,
  RegistryAdaptersValidationResult,
  RouteRegistrySnapshot,
  ToolRegistrySnapshot,
} from "./types";

function validateProvenance(
  obj: {
    adapterVersion?: string;
    registryVersion?: string;
    sourceRegistry?: string;
    adaptedAt?: string;
  },
  path: string,
  expectedSource: string,
  issues: { path: string; message: string }[],
): void {
  if (obj.adapterVersion !== AMY_REGISTRY_ADAPTER_VERSION) {
    issues.push({ path: `${path}.adapterVersion`, message: "version mismatch" });
  }
  if (typeof obj.registryVersion !== "string" || !obj.registryVersion) {
    issues.push({ path: `${path}.registryVersion`, message: "required" });
  }
  if (obj.sourceRegistry !== expectedSource) {
    issues.push({
      path: `${path}.sourceRegistry`,
      message: `expected ${expectedSource}`,
    });
  }
  if (typeof obj.adaptedAt !== "string" || !obj.adaptedAt) {
    issues.push({ path: `${path}.adaptedAt`, message: "required" });
  }
}

function validateFeatureSnapshot(
  snap: FeatureRegistrySnapshot,
  issues: { path: string; message: string }[],
): void {
  if (snap.adapterVersion !== AMY_REGISTRY_ADAPTER_VERSION) {
    issues.push({
      path: "features.adapterVersion",
      message: "version mismatch",
    });
  }
  if (typeof snap.unknownFeatures !== "number") {
    issues.push({ path: "features.unknownFeatures", message: "required number" });
  }
  if (typeof snap.ignoredFields !== "number") {
    issues.push({ path: "features.ignoredFields", message: "required number" });
  }
  if (!Array.isArray(snap.features)) {
    issues.push({ path: "features.features", message: "required array" });
    return;
  }
  for (let i = 0; i < snap.features.length; i++) {
    const f = snap.features[i] as AdaptedFeature;
    if (typeof f.featureId !== "string") {
      issues.push({ path: `features[${i}].featureId`, message: "required" });
    }
    if (typeof f.availability !== "string") {
      issues.push({ path: `features[${i}].availability`, message: "required" });
    }
    validateProvenance(f, `features[${i}]`, "feature", issues);
  }
}

function validateToolSnapshot(
  snap: ToolRegistrySnapshot,
  issues: { path: string; message: string }[],
): void {
  if (snap.adapterVersion !== AMY_REGISTRY_ADAPTER_VERSION) {
    issues.push({ path: "tools.adapterVersion", message: "version mismatch" });
  }
  if (typeof snap.ignoredFields !== "number") {
    issues.push({ path: "tools.ignoredFields", message: "required number" });
  }
  if (!Array.isArray(snap.tools)) {
    issues.push({ path: "tools.tools", message: "required array" });
    return;
  }
  for (let i = 0; i < snap.tools.length; i++) {
    const t = snap.tools[i] as AdaptedTool;
    if (typeof t.toolId !== "string") {
      issues.push({ path: `tools[${i}].toolId`, message: "required" });
    }
    if (typeof t.canRun !== "boolean") {
      issues.push({ path: `tools[${i}].canRun`, message: "required boolean" });
    }
    validateProvenance(t, `tools[${i}]`, "tool", issues);
  }
}

function validateRouteSnapshot(
  snap: RouteRegistrySnapshot,
  issues: { path: string; message: string }[],
): void {
  if (snap.adapterVersion !== AMY_REGISTRY_ADAPTER_VERSION) {
    issues.push({ path: "routes.adapterVersion", message: "version mismatch" });
  }
  if (typeof snap.ignoredFields !== "number") {
    issues.push({ path: "routes.ignoredFields", message: "required number" });
  }
  if (!Array.isArray(snap.routes)) {
    issues.push({ path: "routes.routes", message: "required array" });
    return;
  }
  for (let i = 0; i < snap.routes.length; i++) {
    const r = snap.routes[i] as AdaptedRoute;
    if (typeof r.routeId !== "string") {
      issues.push({ path: `routes[${i}].routeId`, message: "required" });
    }
    if (typeof r.path !== "string") {
      issues.push({ path: `routes[${i}].path`, message: "required" });
    }
    validateProvenance(r, `routes[${i}]`, "route", issues);
  }
}

/**
 * Validate one or all adapter snapshots.
 */
export function validateRegistryAdapters(input: {
  features?: FeatureRegistrySnapshot;
  tools?: ToolRegistrySnapshot;
  routes?: RouteRegistrySnapshot;
}): RegistryAdaptersValidationResult {
  const issues: { path: string; message: string }[] = [];
  if (input.features) validateFeatureSnapshot(input.features, issues);
  if (input.tools) validateToolSnapshot(input.tools, issues);
  if (input.routes) validateRouteSnapshot(input.routes, issues);
  if (!input.features && !input.tools && !input.routes) {
    issues.push({ path: "", message: "no snapshots provided" });
  }
  return Object.freeze({
    ok: issues.length === 0,
    issues: Object.freeze(issues),
  });
}
