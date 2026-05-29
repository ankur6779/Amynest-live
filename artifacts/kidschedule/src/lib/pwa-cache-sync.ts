import { forceClearAllCaches } from "@/lib/force-clear-caches";
import { getDeployVersion } from "@/lib/pwa-version";
import {
  markCacheSyncComplete,
  markDeployReloadScheduled,
  trackStartupEvent,
  waitWithTimeout,
} from "@/lib/startup-orchestrator";

const VERSION_KEY = "amynest:deploy-version";
const CACHE_SYNC_TIMEOUT_MS = 10_000;

export type DeployVersionCheck = {
  mismatch: boolean;
  previous: string | null;
  current: string | null;
};

/** Synchronous read — safe before React mount. */
export function checkDeployVersionMismatch(): DeployVersionCheck {
  if (typeof window === "undefined") {
    return { mismatch: false, previous: null, current: null };
  }
  const current = getDeployVersion();
  let previous: string | null = null;
  try {
    previous = sessionStorage.getItem(VERSION_KEY);
  } catch {
    /* ignore */
  }
  const mismatch = Boolean(previous && current && previous !== current);
  return { mismatch, previous, current };
}

/**
 * Phase 3 background task — never blocks React mount.
 * RULE: never wait for AppCore.
 */
export async function runPwaCacheSyncBackground(): Promise<void> {
  if (typeof window === "undefined") return;

  const deployMeta = getDeployVersion();
  const { mismatch, previous, current } = checkDeployVersionMismatch();

  try {
    if (mismatch && previous && current) {
      console.info("[amynest:pwa] Deploy version changed — scheduling cache purge + reload", {
        from: previous,
        to: current,
      });
      markDeployReloadScheduled(previous, current);
      sessionStorage.setItem(VERSION_KEY, current);
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
    if (deployMeta) sessionStorage.setItem(VERSION_KEY, deployMeta);
    markCacheSyncComplete(null);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err ?? "pwa_sync");
    markCacheSyncComplete(message);
  }
}

/** @deprecated Use runPwaCacheSyncBackground — must not be awaited before React mount. */
export async function syncPwaCacheAndVersion(): Promise<void> {
  await runPwaCacheSyncBackground();
}
