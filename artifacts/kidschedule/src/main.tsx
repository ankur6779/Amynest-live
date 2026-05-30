import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import "./i18n";
import "./lib/notification-deep-link";
import { renderCriticalFallbackHtml } from "@/components/app-fallback-ui";
import { showProductionCrashOverlay } from "@/lib/production-crash-overlay";
import {
  installGlobalErrorHandlers,
  logBootContext,
} from "@/lib/global-error-handlers";
import { installViteChunkRecovery } from "@/lib/vite-chunk-recovery";
import {
  shouldAttemptAutoRecovery,
  tryAutoRecovery,
} from "@/lib/auto-recovery";
import { patchBootDiagnostics } from "@/lib/boot-store";
import { redirectApexToCanonicalWww } from "@/lib/canonical-domain";
import { installStaticAudioGuards } from "@/lib/static-audio-guard";
import {
  installStaticAudioDevTools,
} from "@/lib/static-audio-telemetry";
import { preloadSpeechSynthesisVoices } from "@/lib/emergency-audio";
import { installAmyVoiceAudioDiagnostics } from "@/lib/amy-voice-audio-diag";
import {
  injectStaticAudioPreloadHints,
  installStaticAudioGestureWarmup,
} from "@/lib/static-audio-edge";
import {
  initGlobalAudioWarmup,
  installGlobalAudioWarmupOnGesture,
} from "@/lib/global-audio-warmup";
import { initPhonicsManifestValidation } from "@/lib/phonics-manifest-validation";
import {
  initStartupOrchestrator,
  markReactRendered,
  trackStartupEvent,
} from "@/lib/startup-orchestrator";
import { schedulePostRenderStartup } from "@/lib/startup-background";

declare global {
  interface Window {
    __amynestMark?: (phase: string) => void;
    __amynestDiag?: () => unknown;
    __amynestAppCoreReady?: boolean;
  }
}

if (typeof window !== "undefined" && redirectApexToCanonicalWww()) {
  /* Apex → www before auth, cookies, or React mount */
} else if (
  typeof window !== "undefined" &&
  /[?&]diag=1/.test(window.location.search || "")
) {
  /* ?diag=1 uses lightweight HTML-only diagnostics — main bundle must not run */
} else {

const DYNAMIC_IMPORT_CRASH =
  /dynamically imported module|Importing a module script failed|Failed to fetch dynamically imported module|Loading chunk|ChunkLoadError/i;

window.addEventListener("error", (e) => {
  const message = String(e.message ?? (e.error instanceof Error ? e.error.message : ""));
  if (DYNAMIC_IMPORT_CRASH.test(message)) {
    window.location.reload();
  }
});

window.addEventListener("unhandledrejection", (e) => {
  if (DYNAMIC_IMPORT_CRASH.test(String(e.reason ?? ""))) {
    window.location.reload();
  }
});

/** Single app-wide React Query client — must wrap all useQuery / useMutation hooks. */
const queryClient = new QueryClient();

/* Sync guards only — must not await network, cache, Firebase, or AppCore. */
installViteChunkRecovery();
installGlobalErrorHandlers();
installStaticAudioGuards();
installStaticAudioDevTools();
installStaticAudioGestureWarmup();
installGlobalAudioWarmupOnGesture();
injectStaticAudioPreloadHints();
initPhonicsManifestValidation();
initGlobalAudioWarmup();
preloadSpeechSynthesisVoices();
installAmyVoiceAudioDiagnostics();
logBootContext();

if (import.meta.env.DEV) {
  void import("@/lib/stress-harness").then((m) => m.installStressHarness());
  void import("@/lib/amy-voice-field-validation").then((m) =>
    m.installAmyVoiceFieldValidationHarness(),
  );
}

const mark = (p: string) => {
  try {
    window.__amynestMark?.(p);
  } catch {
    /* breadcrumbs are best-effort */
  }
};

/**
 * Phase 1: mount React immediately.
 * Phase 3+4: background (cache, PWA, native, optional services).
 */
function bootstrap(): void {
  initStartupOrchestrator();

  try {
    mark("bundle-loaded");

    const rootEl = document.getElementById("root");
    if (!rootEl) {
      throw new Error("Missing #root mount node");
    }

    createRoot(rootEl).render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <App />
        </Suspense>
      </QueryClientProvider>,
    );

    mark("react-rendered");
    markReactRendered();
    patchBootDiagnostics({ hostname: window.location.hostname });

    /* Never await — failures must not block the shell. */
    schedulePostRenderStartup();
  } catch (err) {
    console.error("[amynest:bootstrap] Failed to start app", err);
    mark("bootstrap-failed");
    trackStartupEvent("boot_timeout", {
      stage: "phase1_mount",
      message: err instanceof Error ? err.message : String(err),
    });
    showProductionCrashOverlay(
      err instanceof Error
        ? { kind: "bootstrap", message: err.message, stack: err.stack }
        : { kind: "bootstrap", message: String(err ?? "AmyNest could not start.") },
    );
    if (shouldAttemptAutoRecovery(err) && tryAutoRecovery("bootstrap")) {
      return;
    }
    const rootEl = document.getElementById("root");
    if (rootEl) {
      renderCriticalFallbackHtml(
        rootEl,
        err instanceof Error ? err.message : "AmyNest could not start.",
      );
    }
  } finally {
    startSplashDismissal();
  }
}

function startSplashDismissal(): void {
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const isRootEntry =
    window.location.pathname === "/" ||
    window.location.pathname === BASE ||
    window.location.pathname === BASE + "/";

  const isLiteSplash =
    document.documentElement.classList.contains("lite-splash");
  const SPLASH_MIN_MS = !isRootEntry ? 0 : isLiteSplash ? 900 : 3200;
  const SPLASH_MAX_MS = 12000;

  const splashStartedAt = performance.now();
  let splashDismissed = false;
  let pollHandle: ReturnType<typeof setInterval> | null = null;

  function dismissSplash() {
    mark("splash-timer-fired");
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("splash-hide");
      mark("splash-hide-class-added");
      splash.addEventListener(
        "transitionend",
        () => {
          splash.remove();
          mark("splash-hidden");
        },
        { once: true },
      );
    } else {
      mark("splash-hidden");
    }
  }

  function maybeDismissSplash() {
    if (splashDismissed) return false;
    const elapsed = performance.now() - splashStartedAt;
    const minElapsed = elapsed >= SPLASH_MIN_MS;
    const coreReady = window.__amynestAppCoreReady === true;
    const fallbackElapsed = elapsed >= 6000;
    if (!minElapsed || (!coreReady && !fallbackElapsed)) return false;
    splashDismissed = true;
    if (pollHandle !== null) {
      clearInterval(pollHandle);
      pollHandle = null;
    }
    dismissSplash();
    return true;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      mark("splash-raf-fired");
      pollHandle = setInterval(() => {
        maybeDismissSplash();
      }, 80);
      setTimeout(() => {
        if (splashDismissed) return;
        mark("splash-max-timeout");
        splashDismissed = true;
        if (pollHandle !== null) {
          clearInterval(pollHandle);
          pollHandle = null;
        }
        dismissSplash();
      }, SPLASH_MAX_MS);
    });
  });
}

bootstrap();

}
