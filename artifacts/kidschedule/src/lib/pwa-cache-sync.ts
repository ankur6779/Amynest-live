import { reconcileLocalAudioCacheVersion } from "@/lib/local-tts-cache";
import {
  checkDeployVersionMismatch,
  getDeployVersion,
  writeStoredDeployVersion,
} from "@/lib/deploy-version";
import {
  clearRefreshCompleteFlag,
  hasCompletedRefreshCycle,
  runRefreshCycle,
} from "@/lib/refresh-orchestrator";
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
      let reloadAlreadyAttempted = false;
      try {
        reloadAlreadyAttempted = Boolean(sessionStorage.getItem("amynest:deploy-reload-done"));
      } catch {
        /* ignore */
      }

      if (hasCompletedRefreshCycle() || reloadAlreadyAttempted) {
        console.info(
          "[Refresh] Deploy mismatch after prior reload — syncing version without re-reload",
          { from: previous, to: current },
        );
        clearRefreshCompleteFlag();
        writeStoredDeployVersion(current);
        try {
          sessionStorage.removeItem("amynest:deploy-reload-done");
        } catch {
          /* ignore */
        }
        markCacheSyncComplete(null);
        return;
      }

      console.info("[Refresh] Deploy version changed — scheduling cache purge + reload", {
        from: previous,
        to: current,
      });
      markDeployReloadScheduled(previous, current);
      try {
        sessionStorage.setItem("amynest:deploy-reload-done", current);
      } catch {
        /* ignore */
      }

      const outcome = await waitWithTimeout({
        label: "pwa_cache_clear",
        waitingFor: "cache_storage",
        timeoutMs: CACHE_SYNC_TIMEOUT_MS,
        fn: () =>
          runRefreshCycle({
            reason: "deploy_mismatch",
            honorCompleteFlag: false,
            onTimeout: () => {
              trackStartupEvent("startup_timeout", { task: "pwa_cache_clear" });
            },
          }),
        fallback: "timeout" as const,
        onTimeout: () => {
          trackStartupEvent("startup_timeout", { task: "pwa_cache_clear" });
        },
      });

      markCacheSyncComplete(null);
      if (outcome === "scheduled" || outcome === "skipped_in_flight") {
        return;
      }
      writeStoredDeployVersion(current);
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
