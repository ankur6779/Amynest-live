import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";
import "./i18n";
import "./lib/notification-deep-link";
import { initNativeShell } from "./lib/native-shell";
import { getAppApiBaseOrigin } from "./lib/api";
import { redirectWwwToCanonicalApex } from "@/lib/canonical-domain";
import {
  clearCacheRecoveryPending,
  runBootCacheRecoveryIfNeeded,
} from "./lib/boot-recovery";

// Boot diagnostic helpers installed by the inline <script> in index.html.
// They write phase markers to localStorage so we can detect mid-boot crashes
// on the next load and auto-fall back to a minimal splash. See the comment
// block in index.html for the full design.
declare global {
  interface Window {
    __amynestMark?: (phase: string) => void;
    __amynestDiag?: () => unknown;
    __amynestAppCoreReady?: boolean;
  }
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
      if (redirectWwwToCanonicalApex()) return;

      // Purge stale SW/index.html cache before any registration or React mount.
      await runBootCacheRecoveryIfNeeded();

      // Native vs web bootstrap (service worker on web; no-op in Capacitor shells).
      initNativeShell();

      // Orval + authFetch use `/api/...` paths. Native shells and deployed web must
      // hit https://amynest-backend.onrender.com — set the base URL before AppCore loads.
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
    console.error("[bootstrap] Failed to start app", err);
    mark("bootstrap-failed");
    const rootEl = document.getElementById("root");
    if (rootEl) {
      rootEl.innerHTML =
        '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0a061a;color:#f0e8ff;font-family:system-ui,sans-serif;text-align:center"><div><p style="font-weight:600;margin:0 0 12px">AmyNest could not start</p><p style="opacity:0.8;margin:0 0 16px;font-size:14px">Please refresh the page.</p><button type="button" onclick="location.reload()" style="padding:12px 24px;border-radius:999px;border:none;background:linear-gradient(90deg,#7c3aed,#ec4899);color:#fff;font-weight:600;cursor:pointer">Refresh</button></div></div>';
    }
  } finally {
    startSplashDismissal();
  }
}

// Dismiss the splash screen after React has painted AND a minimum display
// time has elapsed, so the "Meet AMY" intro animation can play in full.
// Total perceived duration ≈ 2.7s visible + 0.7s fade = ~3.4s.
// Skip the full animation when the user navigates directly to an inner page
// (e.g. /sign-in, /sign-up) — the splash belongs only to the root entry.
function startSplashDismissal(): void {
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
  const isRootEntry =
    window.location.pathname === "/" ||
    window.location.pathname === BASE ||
    window.location.pathname === BASE + "/";

  // On a known-affected device (lite-splash class set by the inline boot
  // script — iOS, post-crash recovery, or `?liteSplash=1`) shorten the
  // splash to 1200ms so its animations stop competing with React mount
  // for GPU memory. Other browsers keep the full 3200ms intro.
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
    // If AppCore is slow, still dismiss after 6s — AuthBootShell covers the gap.
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
