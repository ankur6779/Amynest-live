import { forceClearAllCaches } from "@/lib/force-clear-caches";
import { getDeployVersion, serviceWorkerScriptUrl } from "@/lib/pwa-version";

const VERSION_KEY = "amynest:deploy-version";

/** Skip SW register on boot — set VITE_SKIP_SW_BOOT=true or sessionStorage `amynest:disable-sw-boot=1`. */
function shouldSkipServiceWorkerBoot(): boolean {
  if (import.meta.env.VITE_SKIP_SW_BOOT === "true") return true;
  try {
    return sessionStorage.getItem("amynest:disable-sw-boot") === "1";
  } catch {
    return false;
  }
}

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
 * Force service worker to activate and reload when deploy meta changes (stale PWA shell).
 */
export async function syncPwaCacheAndVersion(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

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

  if (shouldSkipServiceWorkerBoot()) {
    console.info("[amynest:pwa] Service worker boot registration skipped (debug)");
    return;
  }

  try {
    const swBase = import.meta.env.BASE_URL;
    const reg = await navigator.serviceWorker.register(
      serviceWorkerScriptUrl(swBase),
      {
        scope: `${swBase.replace(/\/$/, "")}/`,
        updateViaCache: "none",
      },
    );

    // Proactively check every registration for a waiting worker after deploy.
    await navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.update().catch(() => {}))))
      .catch(() => {});

    await reg.update().catch(() => {});

    if (reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.info("[amynest:pwa] New service worker active");
    });
  } catch (err) {
    console.warn("[amynest:pwa] Service worker registration failed", err);
  }
}
