import { forceClearAllCaches } from "@/lib/force-clear-caches";

/**
 * Full cache + service worker reset, then hard navigation to a clean app URL.
 * Used by the recovery UI and post-deploy SW updates.
 */
export async function clearCacheAndReload(): Promise<void> {
  await handleRecoveryReload();
}

/** Reload button: purge all caches/SW, then navigate to home without stale state. */
export async function handleRecoveryReload(): Promise<void> {
  if (typeof window === "undefined") return;

  await forceClearAllCaches();

  const origin = window.location.origin;
  const base = (import.meta.env.BASE_URL as string).replace(/\/$/, "") || "";
  window.location.href = `${origin}${base}/`;
}
