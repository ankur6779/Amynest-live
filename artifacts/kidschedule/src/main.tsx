import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";
import "./i18n";
import "./lib/notification-deep-link";
import { renderCriticalFallbackHtml } from "@/components/app-fallback-ui";
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

declare global {
  interface Window {
    __amynestMark?: (phase: string) => void;
    __amynestDiag?: () => unknown;
    __amynestAppCoreReady?: boolean;
  }
}

if (typeof window !== "undefined" && redirectApexToCanonicalWww()) {
  /* Apex → www before auth, cookies, or React mount */
} else {

installViteChunkRecovery();
installGlobalErrorHandlers();
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

    createRoot(rootEl).render(<App />);
    mark("react-rendered");
    clearCacheRecoveryPending();
  } catch (err) {
    console.error("[amynest:bootstrap] Failed to start app", err);
    mark("bootstrap-failed");
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
  const SPLASH_MIN_MS = !isRootEntry ? 0 : isLiteSplash ? 1200 : 3200;
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
