/** Birth Sky public surface (IM-1 First Sky). */
export { default as BirthSkyApp } from "./pages/birth-sky-app";
export { stashBirthSkyReferrer } from "./pages/birth-sky-app";
export {
  FF_BIRTH_SKY,
  isBirthSkyEnabled,
  isBirthSkyHubTileEnabled,
} from "./lib/feature-flags";
export { registerBirthSkyFoundation } from "./foundation/register-birth-sky";
/** IM-6 Lens Platform (Packs 9–10) — extension framework only. */
export {
  BIRTH_SKY_LENS_SDK_VERSION,
  registerLens,
  registerLensDefinition,
  getLens,
  listLenses,
  listExtensionLenses,
  activateLens,
  unloadLens,
  validateLensManifest,
  dumpLensRegistryDiagnostics,
  inspectLensCapabilities,
  buildLensReadonlyContext,
  hasLensPermission,
  canContribute,
} from "./platform";
export type {
  LensDefinition,
  LensMetadata,
  LensPermission,
  RegisteredLens,
  LensReadonlyContext,
} from "./platform";
export {
  BIRTH_SKY_EVENT_NAMES,
  BIRTH_SKY_IM0_EMITTED_EVENTS,
  isBirthSkyEventName,
} from "./lib/event-taxonomy";
export type { BirthSkyAnalyticsEvent } from "./lib/event-taxonomy";
/** @deprecated IM-1 seam — Dashboard is live in IM-2 */
export { BIRTH_SKY_DASHBOARD_BOUNDARY_SEAM } from "./pages/dashboard-boundary-page";
export { BIRTH_SKY_EDIT_DETAILS_SEAM } from "./pages/dashboard/edit-details-boundary";
export type { EphemerisPort } from "./domain/ports/ephemeris-port";
export type { PlaceLookupPort } from "./domain/ports/place-lookup-port";
export { getEphemerisPort } from "./infrastructure/ephemeris/resolve-ephemeris-port";
export { getPlaceLookupPort } from "./infrastructure/geocoding/resolve-place-lookup";
export { getSkyMapRenderer } from "./infrastructure/sky-map/resolve-sky-map-renderer";
export { hydrateSkySnapshot } from "./domain/models/sky-snapshot-compat";
export { isTransitionReady } from "./application/orchestrators/transition-readiness";
export type { SkyMapRenderer } from "./domain/ports/sky-map-renderer-port";
export { SEAL_TRANSITION_ID, SEAL_SLOT_SIZES } from "./components/birth-sky-seal-host";
export { TRADITIONAL_CONTENT_VERSION } from "./constants/traditional-content";
export { evaluateMilestoneEmission } from "./application/orchestrators/reflection-milestones";
export { buildTraditionalData } from "./infrastructure/traditional/build-traditional-data";
export { BIRTH_SKY_CONTEXT_SCHEMA_VERSION } from "./constants/ai-context";
export { applyChunk, createChunkBuffer } from "./application/ai/chunk-buffer";
