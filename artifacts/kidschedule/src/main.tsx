import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";
import "./i18n";
import "./lib/notification-deep-link";
import { renderCriticalFallbackHtml } from "@/components/app-fallback-ui";
import { showProductionCrashOverlay } from "@/lib/production-crash-overlay";
import { initNativeShell } from "./lib/native-shell";
import { getAppApiBaseOrigin } from "./lib/api";
import {
  installGlobalErrorHandlers,
  logBootContext,
} from "@/lib/global-error-handlers";
import { installViteChunkRecovery } from "@/lib/vite-chunk-recovery";
import {
  clearCacheRecoveryPending,
  runBootCacheRecoveryIfNeeded,
} from "@/lib/boot-recovery";
import { syncPwaCacheAndVersion } from "@/lib/pwa-cache-sync";
import { patchBootDiagnostics } from "@/lib/boot-store";
import { redirectApexToCanonicalWww } from "@/lib/canonical-domain";
import { installStaticAudioGuards } from "@/lib/static-audio-guard";
import {
  checkStaticAudioHealthOnBoot,
  installStaticAudioDevTools,
} from "@/lib/static-audio-telemetry";
import {
  injectStaticAudioPreloadHints,
  installStaticAudioGestureWarmup,
} from "@/lib/static-audio-edge";

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

installViteChunkRecovery();
installGlobalErrorHandlers();
installStaticAudioGuards();
installStaticAudioDevTools();
installStaticAudioGestureWarmup();
injectStaticAudioPreloadHints();
void checkStaticAudioHealthOnBoot();
logBootContext();

if (import.meta.env.DEV) {
  void import("@/lib/stress-harness").then((m) => m.installStressHarness());
}

const mark = (p: string) => {
  try {
    window.__amynestMark?.(p);
  } catch {
    /* breadcrumbs are best-effort */
  }
};

async function bootstrap(): Promise<void> {
  try {
    if (typeof window !== "undefined") {
      await runBootCacheRecoveryIfNeeded();
      patchBootDiagnostics({ hostname: window.location.hostname });
      void syncPwaCacheAndVersion();
      initNativeShell();

      const apiOrigin = getAppApiBaseOrigin();
      if (apiOrigin) setBaseUrl(apiOrigin);
    }

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
    clearCacheRecoveryPending();
  } catch (err) {
    console.error("[amynest:bootstrap] Failed to start app", err);
    mark("bootstrap-failed");
    showProductionCrashOverlay(
      err instanceof Error
        ? { kind: "bootstrap", message: err.message, stack: err.stack }
        : { kind: "bootstrap", message: String(err ?? "AmyNest could not start.") },
    );
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

void bootstrap();

}
