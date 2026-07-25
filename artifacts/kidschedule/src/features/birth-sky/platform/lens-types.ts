/**
 * Lens SDK contracts (Phase 3 §11, Pack 9–10).
 * No product-specific lens logic.
 */

import type { LensPermission } from "./permissions";
import type { LensReadonlyContext } from "./lens-context";

export type LensCapability =
  | "providesDashboardPanel"
  | "providesSettings"
  | "contributesAiContext"
  | "requiresBirthProfile"
  | "requiresSkySnapshot"
  | "optionalTraditional"
  | "supportsOfflineCache"
  | "participatesExport"
  | "participatesDelete"
  | "hasOwnCompute"
  | "parentOnly"
  /** Pack 9 §1.8 — Connect segment only with ADR when first compatibility lens ships. */
  | "providesConnectSegment";

export type LensLifecycleState =
  | "registered"
  | "available"
  | "active"
  | "disabled"
  | "retired";

export type LensMetadata = {
  lensId: string;
  displayName: string;
  description: string;
  lensVersion: string;
  capabilities: LensCapability[];
  featureFlag: string;
  orderHint: number;
  privacyScopes: string[];
  owner: string;
  /** Pack 9 / Pack 10 — SDK peer range (exact or `birth_sky_lens_sdk/1.0.0`). */
  sdkVersion?: string;
  /** Opaque min app build for Compatibility Matrix. */
  minAppBuild?: string;
  adrRefs?: string[];
  /** Optional explicit permission allowlist (intersected with capability grants). */
  permissions?: LensPermission[];
};

/** Contribution bindings — only bound when capability declared (Pack 10 §3.1). */
export type LensPlugins = {
  /** Phase 3 setup contribution (optional). */
  setupPlugin?: { steps?: string[] };
  computePlugin?: { hasOwnCompute: boolean };
  segments?: string[];
  dashboard?: { panelId: string };
  settings?: { groupId: string };
  routes?: { basePath: string };
  aiContext?: { contributorId: string };
  offline?: { partitionKey: string };
  export?: { sectionId: string };
  delete?: { cascadeOnBirthSkyDelete: boolean };
  analytics?: { eventPrefix: string };
};

export type LensLifecycleHooks = {
  onRegister?: () => void | Promise<void>;
  onActivate?: (ctx: LensReadonlyContext) => void | Promise<void>;
  onHydrate?: (ctx: LensReadonlyContext) => void | Promise<void>;
  onRefresh?: (ctx: LensReadonlyContext) => void | Promise<void>;
  onDisable?: () => void | Promise<void>;
  onRetire?: () => void | Promise<void>;
  onUnload?: () => void | Promise<void>;
};

/**
 * Lens interface (Pack 10) — declarative definition + optional lazy loader.
 * `load` returns the hydrated definition (chunk); never throws past runtime isolation.
 */
export type LensDefinition = {
  metadata: LensMetadata;
  plugins?: LensPlugins;
  lifecycle?: LensLifecycleHooks;
  /** Lazy chunk factory (Pack 9 §4.5 / Pack 10 §3.2). */
  load?: () => Promise<Partial<Pick<LensDefinition, "plugins" | "lifecycle">> | void>;
};

export type RegisteredLens = {
  metadata: LensMetadata;
  state: LensLifecycleState;
  plugins: LensPlugins;
  lifecycle: LensLifecycleHooks;
  load?: LensDefinition["load"];
  /** Capability-derived + declared permissions (resolved at register). */
  permissions: ReadonlySet<LensPermission>;
  /** True when a lazy chunk has been loaded this session. */
  chunkLoaded: boolean;
  lastError?: string;
};

export type RegisterLensResult =
  | { ok: true; lens: RegisteredLens; idempotent: boolean }
  | { ok: false; error: string; code: "duplicate_conflict" | "invalid_manifest" | "retired" };
