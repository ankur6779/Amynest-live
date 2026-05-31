/**
 * Android WebView audio lifecycle — detect interrupts and recover on foreground.
 */

import { isAndroidAmyNestAudioClient } from "@/lib/device-lite";
import { audioManager } from "@/lib/audio-manager";
import {
  amyVoicePlaybackFsm,
  phonicsPlaybackFsm,
} from "@/lib/audio-playback-state-machine";
import {
  logAndroidLifecycleInterrupt,
  type AudioLifecycleInterruptKind,
} from "@/lib/audio-reliability-telemetry";

let installed = false;
let pendingFocusRecovery = false;
let recoveryCount = 0;
let unrecoveredFocusLoss = 0;

function emitInterrupt(kind: AudioLifecycleInterruptKind, detail?: string): void {
  logAndroidLifecycleInterrupt(kind, detail);
  if (
    kind === "visibility_hidden" ||
    kind === "page_hide" ||
    kind === "window_blur" ||
    kind === "before_unload"
  ) {
    pendingFocusRecovery = true;
  }
}

function recoverAfterForeground(source: AudioLifecycleInterruptKind): void {
  if (!pendingFocusRecovery && source !== "visibility_visible" && source !== "window_focus") {
    return;
  }
  pendingFocusRecovery = false;
  recoveryCount += 1;

  audioManager.warmMediaPipeline(true, { fromUserGesture: false });

  const amySnap = amyVoicePlaybackFsm.getSnapshot();
  const phonicsSnap = phonicsPlaybackFsm.getSnapshot();
  const stuckAmyLoading =
    amySnap.state === "LOADING" &&
    Date.now() - amySnap.updatedAt > 3_500;
  const stuckPhonicsLoading =
    phonicsSnap.state === "LOADING" &&
    Date.now() - phonicsSnap.updatedAt > 3_500;

  if (stuckAmyLoading) {
    amyVoicePlaybackFsm.reset();
  }
  if (stuckPhonicsLoading) {
    phonicsPlaybackFsm.reset();
  }
}

export function getAndroidAudioRecoveryStats(): {
  recovery_count: number;
  unrecovered_focus_loss: number;
  pending_recovery: boolean;
} {
  return {
    recovery_count: recoveryCount,
    unrecovered_focus_loss: unrecoveredFocusLoss,
    pending_recovery: pendingFocusRecovery,
  };
}

export function resetAndroidAudioRecoveryStats(forTests = false): void {
  pendingFocusRecovery = false;
  recoveryCount = 0;
  unrecoveredFocusLoss = 0;
  if (forTests) installed = false;
}

export function installAndroidAudioLifecycleMonitor(): void {
  if (installed || typeof window === "undefined") return;
  if (!isAndroidAmyNestAudioClient()) return;
  installed = true;

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      emitInterrupt("visibility_hidden");
    } else if (document.visibilityState === "visible") {
      emitInterrupt("visibility_visible");
      recoverAfterForeground("visibility_visible");
    }
  });

  window.addEventListener("pagehide", () => {
    emitInterrupt("page_hide");
  });

  window.addEventListener("pageshow", (ev) => {
    emitInterrupt("page_show", (ev as PageTransitionEvent).persisted ? "persisted" : "fresh");
    recoverAfterForeground("page_show");
  });

  window.addEventListener("blur", () => {
    emitInterrupt("window_blur");
  });

  window.addEventListener("focus", () => {
    emitInterrupt("window_focus");
    recoverAfterForeground("window_focus");
  });

  window.addEventListener("beforeunload", () => {
    emitInterrupt("before_unload");
  });
}
