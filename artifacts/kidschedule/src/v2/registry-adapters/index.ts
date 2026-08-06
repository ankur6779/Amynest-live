/**
 * Registry Adapter Layer (Sprint A8.1).
 * One-way Registries → Brain-compatible models.
 * Registries never import this package. Brain never imports registries directly.
 */

export {
  AMY_REGISTRY_ADAPTER_VERSION,
  FEATURE_REGISTRY_VERSION,
  ROUTE_REGISTRY_VERSION,
  TOOL_REGISTRY_VERSION,
  type AdaptedFeature,
  type AdaptedRoute,
  type AdaptedTool,
  type AdapterAvailability,
  type AdapterLifecycle,
  type AdapterProvenance,
  type AdapterSourceRegistry,
  type FeatureRegistrySnapshot,
  type RegistryAdapterHealth,
  type RegistryAdaptersValidationIssue,
  type RegistryAdaptersValidationResult,
  type RegistrySnapshotDiffEntry,
  type RouteRegistrySnapshot,
  type ToolRegistrySnapshot,
  type ToolRegistrySourceEntry,
} from "./types";

export {
  adaptFeatureEntry,
  adaptFeatureRegistry,
  type AdaptFeatureRegistryOptions,
} from "./feature-adapter";

export {
  adaptToolEntry,
  adaptToolRegistry,
  EMPTY_TOOL_REGISTRY_CATALOG,
  type AdaptToolRegistryOptions,
} from "./tool-adapter";

export {
  adaptRouteEntry,
  adaptRouteRegistry,
  type AdaptRouteRegistryOptions,
} from "./route-adapter";

export { validateRegistryAdapters } from "./validate";
export { compareRegistrySnapshots } from "./compare";
export {
  getFeatureRegistrySnapshot,
  getRouteRegistrySnapshot,
  getToolRegistrySnapshot,
} from "./snapshots";
export {
  getRegistryAdapterHealth,
  type GetRegistryAdapterHealthOptions,
} from "./health";
export {
  clearExperienceMapCacheForTests,
  experienceIdForFeature,
} from "./experience-map";
export { isAmyRegistryAdaptersEnabled } from "./flags";
