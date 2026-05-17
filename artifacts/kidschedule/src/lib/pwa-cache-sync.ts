const VERSION_KEY = "amynest:deploy-version";

/**
 * Force service worker to activate and reload when deploy meta changes (stale PWA shell).
 */
export async function syncPwaCacheAndVersion(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const deployMeta =
    document.querySelector('meta[name="amynest-deploy"]')?.getAttribute("content") ?? "";

  try {
    const previous = sessionStorage.getItem(VERSION_KEY);
    if (previous && deployMeta && previous !== deployMeta) {
      console.info("[amynest:pwa] Deploy version changed — reloading", {
        from: previous,
        to: deployMeta,
      });
      sessionStorage.setItem(VERSION_KEY, deployMeta);
      window.location.reload();
      return;
    }
    if (deployMeta) sessionStorage.setItem(VERSION_KEY, deployMeta);
  } catch {
    /* ignore */
  }

  try {
    const reg = await navigator.serviceWorker.register(
      `${import.meta.env.BASE_URL.replace(/\/$/, "")}/sw.js`,
      { scope: `${import.meta.env.BASE_URL.replace(/\/$/, "")}/`, updateViaCache: "none" },
    );
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
