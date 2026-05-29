import { getStartupState, trackStartupEvent } from "@/lib/startup-orchestrator";

const DEPRECATED_SYNC_API = "syncPwaCacheAndVersion";

/**
 * Guards deprecated startup APIs that must only run after React mount.
 * Dev: throws immediately. Prod: telemetry + no-op throw.
 */
export function assertStartupPhaseAfterReactRender(apiName: string): void {
  const { reactRendered, phase } = getStartupState();
  if (reactRendered) return;

  const message =
    `${apiName} cannot run before React render (phase=${phase}). ` +
    `Use runPwaCacheSyncBackground() via schedulePostRenderStartup() instead.`;

  trackStartupEvent("startup_deadlock_detected", {
    api: apiName,
    reason: "deprecated_api_before_react_render",
    phase,
  });

  if (import.meta.env.DEV) {
    throw new Error(message);
  }

  console.error(`[amynest:startup] ${message}`);
}

/** @returns false when caller must no-op */
export function guardDeprecatedSyncPwaCache(): boolean {
  const { reactRendered } = getStartupState();
  if (reactRendered) return true;
  assertStartupPhaseAfterReactRender(DEPRECATED_SYNC_API);
  return false;
}
