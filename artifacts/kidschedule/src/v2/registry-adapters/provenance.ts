/**
 * Provenance + unknown-field accounting — machine only.
 */

import {
  AMY_REGISTRY_ADAPTER_VERSION,
  FEATURE_REGISTRY_VERSION,
  ROUTE_REGISTRY_VERSION,
  TOOL_REGISTRY_VERSION,
  type AdapterSourceRegistry,
} from "./types";

export const KNOWN_FEATURE_FIELDS = Object.freeze([
  "id",
  "purpose",
  "category",
  "discoveryStage",
  "navOwner",
  "askAmyHandoff",
  "premiumRole",
  "analyticsOwner",
  "routeOwner",
  "wedgeEligible",
] as const);

export const KNOWN_TOOL_FIELDS = Object.freeze([
  "id",
  "capabilities",
  "canRun",
  "requirements",
  "toolVersion",
] as const);

export const KNOWN_ROUTE_FIELDS = Object.freeze([
  "path",
  "owner",
  "featureId",
  "lifecycle",
  "redirectTo",
  "notes",
] as const);

export function countIgnoredFields(
  raw: object,
  known: ReadonlyArray<string>,
): number {
  const knownSet = new Set(known);
  let ignored = 0;
  for (const key of Object.keys(raw)) {
    if (!knownSet.has(key)) ignored += 1;
  }
  return ignored;
}

export function provenanceFor(
  sourceRegistry: AdapterSourceRegistry,
  adaptedAt: string,
): {
  adapterVersion: typeof AMY_REGISTRY_ADAPTER_VERSION;
  registryVersion: string;
  sourceRegistry: AdapterSourceRegistry;
  adaptedAt: string;
} {
  const registryVersion =
    sourceRegistry === "feature"
      ? FEATURE_REGISTRY_VERSION
      : sourceRegistry === "route"
        ? ROUTE_REGISTRY_VERSION
        : TOOL_REGISTRY_VERSION;

  return {
    adapterVersion: AMY_REGISTRY_ADAPTER_VERSION,
    registryVersion,
    sourceRegistry,
    adaptedAt,
  };
}
