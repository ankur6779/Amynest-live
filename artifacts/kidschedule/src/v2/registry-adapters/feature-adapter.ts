/**
 * FeatureRegistryAdapter — read-only translation.
 * No mutations. No Hero logic. No visibility decisions.
 */

import {
  V2_FEATURE_REGISTRY,
  type FeatureRegistryEntry,
} from "@/registries/features";
import { experienceIdForFeature } from "./experience-map";
import { freezeDeep } from "./freeze";
import {
  countIgnoredFields,
  KNOWN_FEATURE_FIELDS,
  provenanceFor,
} from "./provenance";
import {
  AMY_REGISTRY_ADAPTER_VERSION,
  FEATURE_REGISTRY_VERSION,
  type AdaptedFeature,
  type AdapterAvailability,
  type AdapterLifecycle,
  type FeatureRegistrySnapshot,
} from "./types";

function mapLifecycle(stage: string): AdapterLifecycle {
  switch (stage) {
    case "hero":
      return "active";
    case "discoverable":
      return "discoverable";
    case "hidden":
      return "hidden";
    case "archived":
      return "archived";
    default:
      return "unknown";
  }
}

function mapAvailability(stage: string): AdapterAvailability {
  switch (stage) {
    case "hero":
    case "discoverable":
      return "available";
    case "hidden":
      return "limited";
    case "archived":
      return "unavailable";
    default:
      return "unknown";
  }
}

function mapCapabilities(entry: FeatureRegistryEntry): string[] {
  const caps: string[] = [`category:${entry.category}`];
  if (entry.wedgeEligible) caps.push("wedge_eligible_fact");
  if (entry.askAmyHandoff && entry.askAmyHandoff !== "none") {
    caps.push(`ask_amy_handoff:${entry.askAmyHandoff}`);
  }
  if (entry.routeOwner.length > 0) caps.push("has_routes");
  return caps;
}

export type AdaptFeatureEntryResult = Readonly<{
  feature: AdaptedFeature;
  ignoredFields: number;
}>;

/**
 * Adapt a single Feature Registry entry.
 * Unknown / extra fields on the source object are ignored.
 */
export function adaptFeatureEntry(
  raw: unknown,
  adaptedAt: string = new Date().toISOString(),
): AdaptFeatureEntryResult | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Partial<FeatureRegistryEntry> & Record<string, unknown>;
  if (typeof entry.id !== "string" || !entry.id) return null;

  const ignoredFields = countIgnoredFields(entry, KNOWN_FEATURE_FIELDS);
  const discoveryStage =
    typeof entry.discoveryStage === "string" ? entry.discoveryStage : "unknown";
  const premiumRole =
    typeof entry.premiumRole === "string" ? entry.premiumRole : "n_a";
  const routeOwner = Array.isArray(entry.routeOwner)
    ? entry.routeOwner.filter((p): p is string => typeof p === "string")
    : [];

  const provenance = provenanceFor("feature", adaptedAt);

  const feature = freezeDeep({
    experienceId: experienceIdForFeature(entry.id),
    featureId: entry.id,
    availability: mapAvailability(discoveryStage),
    capabilities: Object.freeze(
      mapCapabilities({
        id: entry.id,
        purpose: typeof entry.purpose === "string" ? entry.purpose : "",
        category: (entry.category as FeatureRegistryEntry["category"]) ?? "shell",
        discoveryStage: discoveryStage as FeatureRegistryEntry["discoveryStage"],
        navOwner: (entry.navOwner as FeatureRegistryEntry["navOwner"]) ?? "none",
        askAmyHandoff:
          (entry.askAmyHandoff as FeatureRegistryEntry["askAmyHandoff"]) ??
          "none",
        premiumRole: premiumRole as FeatureRegistryEntry["premiumRole"],
        analyticsOwner:
          typeof entry.analyticsOwner === "string" ? entry.analyticsOwner : "",
        routeOwner,
        wedgeEligible: Boolean(entry.wedgeEligible),
      }),
    ),
    premiumRequirement: premiumRole,
    lifecycle: mapLifecycle(discoveryStage),
    metadata: {
      purpose: typeof entry.purpose === "string" ? entry.purpose : "",
      category: typeof entry.category === "string" ? entry.category : "unknown",
      navOwner: typeof entry.navOwner === "string" ? entry.navOwner : "none",
      routeOwner: Object.freeze([...routeOwner]),
      analyticsOwner:
        typeof entry.analyticsOwner === "string" ? entry.analyticsOwner : "",
      askAmyHandoff:
        typeof entry.askAmyHandoff === "string" ? entry.askAmyHandoff : "none",
      wedgeEligible: Boolean(entry.wedgeEligible),
    },
    ...provenance,
    sourceRegistry: "feature" as const,
    registryVersion: FEATURE_REGISTRY_VERSION,
  }) as AdaptedFeature;

  return Object.freeze({ feature, ignoredFields });
}

export type AdaptFeatureRegistryOptions = Readonly<{
  now?: Date;
  /** Inject catalog for tests — defaults to live Feature Registry (read-only). */
  entries?: ReadonlyArray<unknown>;
}>;

/**
 * Adapt Feature Registry → Brain-compatible snapshot.
 */
export function adaptFeatureRegistry(
  options: AdaptFeatureRegistryOptions = {},
): FeatureRegistrySnapshot {
  const now = options.now ?? new Date();
  const adaptedAt = now.toISOString();
  const source = options.entries ?? V2_FEATURE_REGISTRY;
  const features: AdaptedFeature[] = [];
  let ignoredFields = 0;
  let unknownFeatures = 0;

  for (const raw of source) {
    const result = adaptFeatureEntry(raw, adaptedAt);
    if (!result) continue;
    features.push(result.feature);
    ignoredFields += result.ignoredFields;
    if (result.feature.experienceId == null) unknownFeatures += 1;
  }

  return freezeDeep({
    adapterVersion: AMY_REGISTRY_ADAPTER_VERSION,
    registryVersion: FEATURE_REGISTRY_VERSION,
    generatedAt: adaptedAt,
    features: Object.freeze(features),
    unknownFeatures,
    ignoredFields,
  });
}
