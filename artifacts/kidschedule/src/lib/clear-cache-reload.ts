/**
 * Full cache + service worker reset, then hard navigation to a clean app URL.
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

  const origin = window.location.origin;
  const base = (import.meta.env.BASE_URL as string).replace(/\/$/, "") || "";
  const home = `${origin}${base}/`;
  const fresh = new URL(home);
  fresh.searchParams.set("_r", String(Date.now()));
  window.location.replace(fresh.toString());
}
