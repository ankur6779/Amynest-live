/**
 * Full cache + service worker reset, then hard navigation reload.
 * Used by the recovery UI and post-deploy SW updates.
 */
export async function clearCacheAndReload(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
  } catch {
    /* ignore */
  }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
  } catch {
    /* ignore */
  }

  const url = new URL(window.location.href);
  if (url.pathname === "/index.html" || url.pathname.endsWith("/index.html")) {
    url.pathname = url.pathname.replace(/\/index\.html$/, "") || "/";
  }
  url.searchParams.set("_r", String(Date.now()));
  window.location.replace(url.toString());
}
