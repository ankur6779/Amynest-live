import { forceClearAllCaches } from "@/lib/force-clear-caches";
import { resetTtsApiCircuit } from "@/lib/amy-voice-circuit";

/**
 * Full cache + service worker reset, then hard navigation to a clean app URL.
 * Used by the recovery UI and post-deploy SW updates.
 */
export async function clearCacheAndReload(): Promise<void> {
  await handleRecoveryReload();
}

function resetAudioStateAfterCacheClear(): void {
  resetTtsApiCircuit();
  void import("@/lib/local-tts-cache").then((m) => m.clearAllLocalCachedAudio()).catch(() => undefined);
}

/** Reload button: purge all caches/SW, then navigate to home without stale state. */
export async function handleRecoveryReload(): Promise<void> {
  if (typeof window === "undefined") return;

  resetAudioStateAfterCacheClear();
  await forceClearAllCaches();

  const origin = window.location.origin;
  const base = (import.meta.env.BASE_URL as string).replace(/\/$/, "") || "";
  window.location.href = `${origin}${base}/`;
}
