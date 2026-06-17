import { forceClearAllCaches } from "@/lib/force-clear-caches";
import { reconcileLocalAudioCacheVersion } from "@/lib/local-tts-cache";
import {
  checkDeployVersionMismatch,
  getDeployVersion,
  writeStoredDeployVersion,
} from "@/lib/deploy-version";
import { guardDeprecatedSyncPwaCache } from "@/lib/startup-api-guard";
import {
  markCacheSyncComplete,
  markDeployReloadScheduled,
  trackStartupEvent,
  waitWithTimeout,
} from "@/lib/startup-orchestrator";

const CACHE_SYNC_TIMEOUT_MS = 10_000;

export type DeployVersionCheck = {
  mismatch: boolean;
  previous: string | null;
  current: string | null;
};

export { checkDeployVersionMismatch } from "@/lib/deploy-version";

/**
 * Phase 3 background task — never blocks React mount.
 * RULE: never wait for AppCore.
 */
export async function runPwaCacheSyncBackground(): Promise<void> {
  if (typeof window === "undefined") return;

  const deployMeta = getDeployVersion();
  const { mismatch, previous, current } = checkDeployVersionMismatch();

  // Audio-asset cache busting (Phase D) — runs on every platform incl. native
  // shells that skip the service worker. No-op unless AUDIO_ASSET_VERSION changed.
  void reconcileLocalAudioCacheVersion();

  try {
    if (mismatch && previous && current) {
      console.info("[amynest:pwa] Deploy version changed — scheduling cache purge + reload", {
        from: previous,
        to: current,
      });
      markDeployReloadScheduled(previous, current);
      writeStoredDeployVersion(current);
      try {
        sessionStorage.setItem("amynest:deploy-reload-done", current);
      } catch {
        /* ignore */
      }

      await waitWithTimeout({
        label: "pwa_cache_clear",
        waitingFor: "cache_storage",
        timeoutMs: CACHE_SYNC_TIMEOUT_MS,
        fn: () => forceClearAllCaches(),
        fallback: undefined,
        onTimeout: () => {
          trackStartupEvent("startup_timeout", { task: "pwa_cache_clear" });
        },
      });

      markCacheSyncComplete(null);
      window.location.reload();
      return;
    }

    try {
      if (
        deployMeta &&
        sessionStorage.getItem("amynest:deploy-reload-done") === deployMeta
      ) {
        sessionStorage.removeItem("amynest:deploy-reload-done");
      }
    } catch {
      /* ignore */
    }
    if (deployMeta) writeStoredDeployVersion(deployMeta);
    markCacheSyncComplete(null);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err ?? "pwa_sync");
    markCacheSyncComplete(message);
  }
}

/**
 * @deprecated Use runPwaCacheSyncBackground via schedulePostRenderStartup.
 * Blocked before reactRendered — throws in DEV, telemetry + no-op in production.
 */
export async function syncPwaCacheAndVersion(): Promise<void> {
  if (!guardDeprecatedSyncPwaCache()) return;
  await runPwaCacheSyncBackground();
}
