/**
 * Readonly registry adapter snapshots — developer helpers.
 * Never mutate source registries.
 */

import { adaptFeatureRegistry } from "./feature-adapter";
import { adaptRouteRegistry } from "./route-adapter";
import { adaptToolRegistry } from "./tool-adapter";
import type {
  FeatureRegistrySnapshot,
  RouteRegistrySnapshot,
  ToolRegistrySnapshot,
} from "./types";

export function getFeatureRegistrySnapshot(
  now?: Date,
): FeatureRegistrySnapshot {
  return adaptFeatureRegistry({ now });
}

export function getToolRegistrySnapshot(now?: Date): ToolRegistrySnapshot {
  return adaptToolRegistry({ now });
}

export function getRouteRegistrySnapshot(now?: Date): RouteRegistrySnapshot {
  return adaptRouteRegistry({ now });
}
