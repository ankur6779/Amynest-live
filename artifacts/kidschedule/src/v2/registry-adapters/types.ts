/**
 * Registry Adapter Layer — Brain-compatible models only.
 * Architecture Freeze v1.0 · Sprint A8.1.
 *
 * One-way: Registries → Adapters → (future) Amy Brain.
 * Never mutates registries. No execution. No Hero / visibility / routing decisions.
 */

export const AMY_REGISTRY_ADAPTER_VERSION = "amy_registry_adapter.v1" as const;

/** Source registry schema versions — machine only (not owned by adapters). */
export const FEATURE_REGISTRY_VERSION = "feature_registry.s0_t03" as const;
export const ROUTE_REGISTRY_VERSION = "route_registry.s0_t02" as const;
/** Tool Registry not shipped — placeholder version for provenance. */
export const TOOL_REGISTRY_VERSION = "tool_registry.unshipped" as const;

export type AdapterSourceRegistry = "feature" | "tool" | "route";

/**
 * Provenance on every adapted object — machine only.
 * Never UI. Never AI.
 */
export type AdapterProvenance = Readonly<{
  adapterVersion: typeof AMY_REGISTRY_ADAPTER_VERSION;
  registryVersion: string;
  sourceRegistry: AdapterSourceRegistry;
  adaptedAt: string;
}>;

/** Availability facts for Brain — not UI visibility. */
export type AdapterAvailability =
  | "available"
  | "limited"
  | "unavailable"
  | "unknown";

export type AdapterLifecycle =
  | "active"
  | "discoverable"
  | "hidden"
  | "archived"
  | "canonical"
  | "alias"
  | "redirect"
  | "deprecated"
  | "unknown";

/** Feature Registry → Brain model. */
export type AdaptedFeature = Readonly<{
  experienceId: string | null;
  featureId: string;
  availability: AdapterAvailability;
  capabilities: ReadonlyArray<string>;
  premiumRequirement: string;
  lifecycle: AdapterLifecycle;
  metadata: Readonly<{
    purpose: string;
    category: string;
    navOwner: string;
    routeOwner: ReadonlyArray<string>;
    analyticsOwner: string;
    askAmyHandoff: string;
    /** Registry fact only — adapters never apply Hero logic. */
    wedgeEligible: boolean;
  }>;
  adapterVersion: typeof AMY_REGISTRY_ADAPTER_VERSION;
  registryVersion: typeof FEATURE_REGISTRY_VERSION | string;
  sourceRegistry: "feature";
  adaptedAt: string;
}>;

/**
 * Tool Registry source shape (injectable).
 * Tool Registry catalog is not owned here — empty default until S0-T04.
 */
export type ToolRegistrySourceEntry = Readonly<{
  id: string;
  capabilities?: ReadonlyArray<string>;
  canRun?: boolean;
  requirements?: ReadonlyArray<string>;
  toolVersion?: string;
  /** Unknown fields ignored by adapter. */
  [key: string]: unknown;
}>;

/** Tool Registry → Brain model. */
export type AdaptedTool = Readonly<{
  toolId: string;
  capabilities: ReadonlyArray<string>;
  canRun: boolean;
  requirements: ReadonlyArray<string>;
  toolVersion: string;
  adapterVersion: typeof AMY_REGISTRY_ADAPTER_VERSION;
  registryVersion: typeof TOOL_REGISTRY_VERSION | string;
  sourceRegistry: "tool";
  adaptedAt: string;
}>;

/** Route Registry → Brain model. */
export type AdaptedRoute = Readonly<{
  routeId: string;
  path: string;
  owner: string;
  availability: AdapterAvailability;
  lifecycle: AdapterLifecycle;
  featureId: string | null;
  adapterVersion: typeof AMY_REGISTRY_ADAPTER_VERSION;
  registryVersion: typeof ROUTE_REGISTRY_VERSION | string;
  sourceRegistry: "route";
  adaptedAt: string;
}>;

export type FeatureRegistrySnapshot = Readonly<{
  adapterVersion: typeof AMY_REGISTRY_ADAPTER_VERSION;
  registryVersion: typeof FEATURE_REGISTRY_VERSION | string;
  generatedAt: string;
  features: ReadonlyArray<AdaptedFeature>;
  /** Features with no Brain experienceId mapping. */
  unknownFeatures: number;
  /** Count of unknown source fields ignored during adapt. */
  ignoredFields: number;
}>;

export type ToolRegistrySnapshot = Readonly<{
  adapterVersion: typeof AMY_REGISTRY_ADAPTER_VERSION;
  registryVersion: typeof TOOL_REGISTRY_VERSION | string;
  generatedAt: string;
  tools: ReadonlyArray<AdaptedTool>;
  /** True when adapting the empty default (Tool Registry not shipped). */
  usingEmptyCatalog: boolean;
  ignoredFields: number;
}>;

export type RouteRegistrySnapshot = Readonly<{
  adapterVersion: typeof AMY_REGISTRY_ADAPTER_VERSION;
  registryVersion: typeof ROUTE_REGISTRY_VERSION | string;
  generatedAt: string;
  routes: ReadonlyArray<AdaptedRoute>;
  ignoredFields: number;
}>;

/**
 * Developer-only adapter health summary.
 * Never UI. Never production Brain logic.
 */
export type RegistryAdapterHealth = Readonly<{
  featureCount: number;
  toolCount: number;
  routeCount: number;
  unknownFeatures: number;
  ignoredFields: number;
  adapterVersion: typeof AMY_REGISTRY_ADAPTER_VERSION;
}>;

export type RegistryAdaptersValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type RegistryAdaptersValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<RegistryAdaptersValidationIssue>;
}>;

export type RegistrySnapshotDiffEntry = Readonly<{
  path: string;
  before: unknown;
  after: unknown;
}>;
