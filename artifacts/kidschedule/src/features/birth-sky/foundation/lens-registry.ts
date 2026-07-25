/**
 * Lens Registry facade (Pack 9 / Phase 3) — re-exports platform registry.
 * Kept under foundation/ for IM-0 import stability.
 */

export type {
  LensCapability,
  LensLifecycleState,
  LensMetadata,
  RegisteredLens,
  RegisterLensResult,
  LensPlugins,
  LensDefinition,
} from "../platform/lens-types";

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
} from "../platform/lens-registry";
