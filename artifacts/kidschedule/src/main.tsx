import "./boot-phase";
import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { setAppQueryClient } from "@/lib/app-query-client";
import { createSelfHealingQueryClient } from "@/lib/self-healing/query-recovery";
import { installSelfHealingRuntime } from "@/lib/self-healing/install";
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
import { runRefreshCycle } from "@/lib/refresh-orchestrator";
import { patchBootDiagnostics } from "@/lib/boot-store";
import { redirectApexToCanonicalWww } from "@/lib/canonical-domain";
import { installStaticAudioGuards } from "@/lib/static-audio-guard";
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
    void runRefreshCycle({ reason: "main_dynamic_import_error" });
  }
});

window.addEventListener("unhandledrejection", (e) => {
  if (DYNAMIC_IMPORT_CRASH.test(String(e.reason ?? ""))) {
    void runRefreshCycle({ reason: "main_dynamic_import_rejection" });
  }
});

/** Self-healing React Query client — auto-retry, invalidate, refetch (Level 4). */
const queryClient = createSelfHealingQueryClient();
setAppQueryClient(queryClient);
installSelfHealingRuntime();

/* Sync guards only — must not await network, cache, Firebase, or AppCore. */
installViteChunkRecovery();
installGlobalErrorHandlers();
installStaticAudioGuards();
logBootContext();

const installPostPaintAnalytics = () => {
  void import("@/lib/sentry").then((m) => m.initWebSentry());
};

if (import.meta.env.DEV) {
  const installDeferredAudioDevTools = () => {
    void import("@/lib/static-audio-telemetry").then((m) => m.installStaticAudioDevTools());
    void import("@/lib/amy-voice-audio-diag").then((m) => m.installAmyVoiceAudioDiagnostics());
    void import("@/lib/audio-reliability-telemetry").then((m) =>
      m.installAudioReliabilityDevTools(),
    );
    void import("@/lib/audio-auto-fix-engine").then((m) => m.installAudioAutoFixDevTools());
    void import("@/lib/audio-release-certification").then((m) =>
      m.installAudioReleaseCertificationDevTools(),
    );
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(installDeferredAudioDevTools, { timeout: 8_000 });
  } else {
    globalThis.setTimeout(installDeferredAudioDevTools, 8_000);
  }
  void import("@/lib/stress-harness").then((m) => m.installStressHarness());
  void import("@/lib/audio-stress-harness").then((m) => m.installAudioStressHarness());
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
    requestAnimationFrame(() => {
      requestAnimationFrame(installPostPaintAnalytics);
    });
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
      renderCriticalFallbackHtml(rootEl);
    }
  } finally {
    startSplashDismissal();
  }
}

function startSplashDismissal(): void {
  const SPLASH_MIN_MS = 0;
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
    if (!minElapsed) return false;
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
