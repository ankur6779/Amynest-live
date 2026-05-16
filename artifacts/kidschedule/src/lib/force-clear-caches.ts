/**
 * Wipe Cache Storage and unregister all service workers.
 * Used on crash recovery and by the "Reload AmyNest" button.
 */
export async function forceClearAllCaches(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key).catch(() => false)));
    }
  } catch {
    /* ignore */
  }

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((reg) => reg.unregister().catch(() => false)),
      );
    }
  } catch {
    /* ignore */
  }
}
