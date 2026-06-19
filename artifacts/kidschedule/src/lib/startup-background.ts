/**
 * Phase 3 + 4 startup tasks — all run after React mount; failures are non-fatal.
 */

import { setBaseUrl } from "@workspace/api-client-react";
import { getAppApiBaseOrigin } from "@/lib/api";
import {
  clearCacheRecoveryPending,
  runBootCacheRecoveryIfNeeded,
} from "@/lib/boot-recovery";
import { patchBootDiagnostics } from "@/lib/boot-store";
import { initNativeShell, registerWebServiceWorker } from "@/lib/native-shell";
import { installNativeHardwareBackHandler } from "@/lib/navigation-orchestrator";
import { initCapacitorPushTapHandling } from "@/lib/native-push-bridge";
import {
  initPreSignupLocalNotificationListeners,
  wireAndroidPreSignupTapMetaHandler,
} from "@/lib/pre-signup-reengagement/local-notifications";
import { runPwaCacheSyncBackground, checkDeployVersionMismatch } from "@/lib/pwa-cache-sync";
import {
  enterStartupPhase,
  markBackgroundInitComplete,
  markOptionalServicesComplete,
  markServiceWorkerReady,
  trackStartupEvent,
  waitWithTimeout,
} from "@/lib/startup-orchestrator";

const BOOT_CACHE_RECOVERY_TIMEOUT_MS = 8_000;
const OPTIONAL_SERVICE_TIMEOUT_MS = 6_000;

async function probeServiceWorker(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    return Boolean(reg);
  } catch {
    return false;
  }
}

/** Phase 3 — cache, deploy version, native shell, API. */
export async function runBackgroundStartup(): Promise<void> {
  enterStartupPhase("background_init");

  if (typeof window !== "undefined") {
    patchBootDiagnostics({ hostname: window.location.hostname });

    wireAndroidPreSignupTapMetaHandler();
    void initPreSignupLocalNotificationListeners();

    void runPwaCacheSyncBackground();

    await waitWithTimeout({
      label: "boot_cache_recovery",
      waitingFor: "cache_storage",
      timeoutMs: BOOT_CACHE_RECOVERY_TIMEOUT_MS,
      fn: () => runBootCacheRecoveryIfNeeded(),
      fallback: undefined,
    });

    try {
      initNativeShell();
      installNativeHardwareBackHandler();
      registerWebServiceWorker();
    } catch (err) {
      console.warn("[amynest:startup] native shell init failed", err);
    }

    const apiOrigin = getAppApiBaseOrigin();
    if (apiOrigin) setBaseUrl(apiOrigin);

    const swOk = await waitWithTimeout({
      label: "service_worker_probe",
      waitingFor: "service_worker",
      timeoutMs: 3_000,
      fn: () => probeServiceWorker(),
      fallback: false,
    });
    if (swOk) markServiceWorkerReady();
  }

  clearCacheRecoveryPending();
  markBackgroundInitComplete();
}

/** Phase 4 — push, audio health, non-critical probes. */
export async function runOptionalStartupServices(): Promise<void> {
  enterStartupPhase("optional_services");

  await waitWithTimeout({
    label: "push_tap_handling",
    waitingFor: "capacitor_push",
    timeoutMs: OPTIONAL_SERVICE_TIMEOUT_MS,
    fn: () => initCapacitorPushTapHandling(),
    fallback: undefined,
  });

  markOptionalServicesComplete();
  trackStartupEvent("startup_phase_completed", { phase: "ready" });
}

/** Fire-and-forget after Phase 1. */
export function schedulePostRenderStartup(): void {
  void (async () => {
    try {
      await runBackgroundStartup();
      await runOptionalStartupServices();
    } catch (err) {
      console.error("[amynest:startup] background init error", err);
      trackStartupEvent("startup_timeout", {
        phase: "background_unhandled",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  })();
}
