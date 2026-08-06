/**
 * RegistryAdapterHealth — developer only.
 * Never UI. Never production Brain logic.
 */

import { adaptFeatureRegistry } from "./feature-adapter";
import { adaptRouteRegistry } from "./route-adapter";
import { adaptToolRegistry } from "./tool-adapter";
import { freezeDeep } from "./freeze";
import {
  AMY_REGISTRY_ADAPTER_VERSION,
  type FeatureRegistrySnapshot,
  type RegistryAdapterHealth,
  type RouteRegistrySnapshot,
  type ToolRegistrySnapshot,
} from "./types";

export type GetRegistryAdapterHealthOptions = Readonly<{
  now?: Date;
  features?: FeatureRegistrySnapshot;
  tools?: ToolRegistrySnapshot;
  routes?: RouteRegistrySnapshot;
  /** Injectable tool catalog when tools snapshot not provided. */
  toolEntries?: ReadonlyArray<unknown>;
}>;

/**
 * Aggregate adapter health from snapshots (or live adapt if omitted).
 */
export function getRegistryAdapterHealth(
  options: GetRegistryAdapterHealthOptions = {},
): RegistryAdapterHealth {
  const now = options.now ?? new Date();
  const features =
    options.features ?? adaptFeatureRegistry({ now });
  const tools =
    options.tools ??
    adaptToolRegistry({ now, entries: options.toolEntries });
  const routes = options.routes ?? adaptRouteRegistry({ now });

  return freezeDeep({
    featureCount: features.features.length,
    toolCount: tools.tools.length,
    routeCount: routes.routes.length,
    unknownFeatures: features.unknownFeatures,
    ignoredFields:
      features.ignoredFields + tools.ignoredFields + routes.ignoredFields,
    adapterVersion: AMY_REGISTRY_ADAPTER_VERSION,
  });
}
