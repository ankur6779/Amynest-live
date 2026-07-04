import { resetTtsApiCircuit } from "@/lib/amy-voice-circuit";
import {
  clearRefreshCompleteFlag,
  runRefreshCycle,
  type RefreshOutcome,
} from "@/lib/refresh-orchestrator";

/**
 * Full cache + service worker reset, then hard navigation to a clean app URL.
 * Used by the recovery UI and post-deploy SW updates.
 */
export async function clearCacheAndReload(): Promise<RefreshOutcome> {
  return handleRecoveryReload();
}

function resetAudioStateAfterCacheClear(): void {
  resetTtsApiCircuit();
  void import("@/lib/local-tts-cache").then((m) => m.clearAllLocalCachedAudio()).catch(() => undefined);
}

/** Reload button: purge all caches/SW, then navigate to home without stale state. */
export async function handleRecoveryReload(options?: {
  reason?: string;
  force?: boolean;
  onTimeout?: () => void;
}): Promise<RefreshOutcome> {
  if (typeof window === "undefined") return "failed";

  resetAudioStateAfterCacheClear();
  if (options?.force) {
    clearRefreshCompleteFlag();
  }
  return runRefreshCycle({
    reason: options?.reason ?? "recovery_reload",
    honorCompleteFlag: !options?.force,
    onTimeout: options?.onTimeout,
  });
}
