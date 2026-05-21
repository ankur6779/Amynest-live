import { forceClearAllCaches } from "@/lib/force-clear-caches";
import { getDeployVersion } from "@/lib/pwa-version";

const VERSION_KEY = "amynest:deploy-version";

/** Wait for AppCore mount so deploy reload does not look like a post-splash crash. */
function waitForAppCoreReady(maxMs = 20_000): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const win = window as Window & { __amynestAppCoreReady?: boolean };
  if (win.__amynestAppCoreReady) return Promise.resolve();

  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (win.__amynestAppCoreReady || Date.now() - started >= maxMs) {
        clearInterval(id);
        resolve();
      }
    };
    const id = setInterval(tick, 120);
    tick();
  });
}

/**
 * Track deploy meta changes and reload once when the shell version changes.
 */
export async function syncPwaCacheAndVersion(): Promise<void> {
  if (typeof window === "undefined") return;

  const deployMeta = getDeployVersion();

  try {
    const previous = sessionStorage.getItem(VERSION_KEY);
    if (previous && deployMeta && previous !== deployMeta) {
      console.info("[amynest:pwa] Deploy version changed — clearing caches and reloading", {
        from: previous,
        to: deployMeta,
      });
      sessionStorage.setItem(VERSION_KEY, deployMeta);
      try {
        sessionStorage.setItem("amynest:deploy-reload-done", deployMeta);
      } catch {
        /* ignore */
      }
      await waitForAppCoreReady();
      await forceClearAllCaches();
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
  } catch {
    /* ignore */
  }
}
