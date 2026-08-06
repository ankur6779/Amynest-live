/**
 * RouteRegistryAdapter — read-only translation.
 * No routing decisions. No mutations.
 */

import {
  V2_ROUTE_REGISTRY,
  type RouteRegistryEntry,
} from "@/registries/routes";
import { freezeDeep } from "./freeze";
import {
  countIgnoredFields,
  KNOWN_ROUTE_FIELDS,
  provenanceFor,
} from "./provenance";
import {
  AMY_REGISTRY_ADAPTER_VERSION,
  ROUTE_REGISTRY_VERSION,
  type AdaptedRoute,
  type AdapterAvailability,
  type AdapterLifecycle,
  type RouteRegistrySnapshot,
} from "./types";

function mapLifecycle(lifecycle: string): AdapterLifecycle {
  switch (lifecycle) {
    case "canonical":
      return "canonical";
    case "alias":
      return "alias";
    case "redirect":
      return "redirect";
    case "deprecated":
      return "deprecated";
    case "archived_experience":
      return "archived";
    default:
      return "unknown";
  }
}

function mapAvailability(lifecycle: string): AdapterAvailability {
  switch (lifecycle) {
    case "canonical":
    case "alias":
      return "available";
    case "redirect":
    case "deprecated":
      return "limited";
    case "archived_experience":
      return "unavailable";
    default:
      return "unknown";
  }
}

function routeIdFromPath(path: string): string {
  return `route:${path}`;
}

export type AdaptRouteEntryResult = Readonly<{
  route: AdaptedRoute;
  ignoredFields: number;
}>;

/**
 * Adapt a single Route Registry entry.
 * Unknown fields ignored.
 */
export function adaptRouteEntry(
  raw: unknown,
  adaptedAt: string = new Date().toISOString(),
): AdaptRouteEntryResult | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Partial<RouteRegistryEntry> & Record<string, unknown>;
  if (typeof entry.path !== "string" || !entry.path) return null;

  const ignoredFields = countIgnoredFields(entry, KNOWN_ROUTE_FIELDS);
  const lifecycle =
    typeof entry.lifecycle === "string" ? entry.lifecycle : "unknown";
  const provenance = provenanceFor("route", adaptedAt);

  const route = freezeDeep({
    routeId: routeIdFromPath(entry.path),
    path: entry.path,
    owner: typeof entry.owner === "string" ? entry.owner : "unknown",
    availability: mapAvailability(lifecycle),
    lifecycle: mapLifecycle(lifecycle),
    featureId: typeof entry.featureId === "string" ? entry.featureId : null,
    ...provenance,
    sourceRegistry: "route" as const,
    registryVersion: ROUTE_REGISTRY_VERSION,
  }) as AdaptedRoute;

  return Object.freeze({ route, ignoredFields });
}

export type AdaptRouteRegistryOptions = Readonly<{
  now?: Date;
  /** Inject catalog for tests — defaults to live Route Registry (read-only). */
  entries?: ReadonlyArray<unknown>;
}>;

/**
 * Adapt Route Registry → Brain-compatible snapshot.
 */
export function adaptRouteRegistry(
  options: AdaptRouteRegistryOptions = {},
): RouteRegistrySnapshot {
  const now = options.now ?? new Date();
  const adaptedAt = now.toISOString();
  const source = options.entries ?? V2_ROUTE_REGISTRY;
  const routes: AdaptedRoute[] = [];
  let ignoredFields = 0;

  for (const raw of source) {
    const result = adaptRouteEntry(raw, adaptedAt);
    if (!result) continue;
    routes.push(result.route);
    ignoredFields += result.ignoredFields;
  }

  return freezeDeep({
    adapterVersion: AMY_REGISTRY_ADAPTER_VERSION,
    registryVersion: ROUTE_REGISTRY_VERSION,
    generatedAt: adaptedAt,
    routes: Object.freeze(routes),
    ignoredFields,
  });
}
