/**
 * Birth Sky Lens Platform public surface (IM-6 / Packs 9–10).
 * Runtime ops / ORS (Pack 11) intentionally not exported.
 */

export { BIRTH_SKY_LENS_SDK_VERSION, lensOfflinePartitionKey, lensRouteNamespace, lensAnalyticsPrefix } from "./constants";
export type { LensPermission, ContributionKind } from "./permissions";
export {
  ALL_LENS_PERMISSIONS,
  permissionsFromCapabilities,
  resolveLensPermissions,
  hasLensPermission,
  canContribute,
} from "./permissions";
export type {
  LensCapability,
  LensLifecycleState,
  LensMetadata,
  LensPlugins,
  LensLifecycleHooks,
  LensDefinition,
  RegisteredLens,
  RegisterLensResult,
} from "./lens-types";
export type { LensReadonlyContext, LensAiEntitlementState, LensVersionBundle } from "./lens-context";
export { buildLensReadonlyContext } from "./lens-context";
export type { LensValidationIssue, LensValidationReport } from "./lens-validate";
export { validateLensManifest, validateLensDefinition } from "./lens-validate";
export {
  registerLens,
  registerLensDefinition,
  getLens,
  listLenses,
  listExtensionLenses,
  setLensState,
  enableLens,
  disableLens,
  getDuplicateReports,
  __resetLensRegistryForTests,
} from "./lens-registry";
export type { ListLensesFilter } from "./lens-registry";
export {
  activateLens,
  refreshLens,
  unloadLens,
  isolateLensTask,
  getLensRuntimeStatus,
  getLensRuntimeError,
  __resetLensRuntimeForTests,
} from "./lens-runtime";
export type { LensRuntimeStatus, ActivateLensInput } from "./lens-runtime";
export {
  dumpLensRegistryDiagnostics,
  inspectLensCapabilities,
  formatLensValidationErrors,
  listPlatformPermissionCatalog,
} from "./lens-diagnostics";
export type { RegistryDiagnosticsDump, LensCapabilityInspection } from "./lens-diagnostics";
