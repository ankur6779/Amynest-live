/**
 * Runtime native vs web detection. Safe to import in Vite web builds — no
 * Capacitor-only modules are loaded at the top level.
 */

import { isAndroidMobileShell, isStandalonePwa } from "@/lib/device-lite";

type NativePlatform = "ios" | "android" | "web";

type AmyNestWindow = Window & {
  __AMYNEST_WRAPPER?: string;
  AndroidPush?: unknown;
  AmyNestPushNative?: unknown;
  Capacitor?: {
    getPlatform?: () => NativePlatform;
    isNativePlatform?: () => boolean;
  };
};

function hasServiceWorkerOrigin(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.protocol === "https:" ||
    window.location.protocol === "http:"
  );
}

/** True inside Capacitor / Android WebView / iOS wrapper shells. */
export function isNativeAmyNestShell(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as AmyNestWindow;

  const proto = (win.location.protocol || "").toLowerCase();
  if (proto === "capacitor:" || proto === "ionic:") return true;
  if (
    proto === "https:" &&
    win.location.hostname === "localhost" &&
    typeof win.Capacitor !== "undefined"
  ) {
    return true;
  }

  if (win.Capacitor?.isNativePlatform?.() === true) return true;
  if (typeof win.AndroidPush !== "undefined") return true;
  if (typeof win.AmyNestPushNative !== "undefined") return true;
  if (typeof win.__AMYNEST_WRAPPER === "string") return true;
  if (
    typeof navigator !== "undefined" &&
    /AmyNestAndroid/.test(navigator.userAgent)
  ) {
    return true;
  }

  return false;
}

/** Capacitor iOS/Android shell (not the legacy AmyNestAndroid WebView APK). */
export function isCapacitorNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (window as AmyNestWindow).Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

/**
 * Firebase IndexedDB auth persistence on Capacitor WKWebView (iOS + Simulator)
 * often hangs `onAuthStateChanged` and breaks sign-in. Use localStorage instead.
 */
export function useFirebaseIndexedDbPersistence(): boolean {
  return false;
}

/** iOS Simulator — Sign in with Apple is unreliable; prefer email for testing. */
export function isIosSimulator(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Simulator/i.test(navigator.userAgent);
}

/** Browser PWA service workers — disabled inside native WebViews. */
export function canUseBrowserServiceWorkers(): boolean {
  return hasServiceWorkerOrigin() && !isNativeAmyNestShell();
}

let nativeShellInitialized = false;

function configureNativeViewport(): void {
  if (!isCapacitorNativeShell()) return;

  void import("@capacitor/status-bar")
    .then(({ StatusBar }) =>
      StatusBar.setOverlaysWebView({ overlay: false }),
    )
    .catch(() => {
      /* Optional native plugin; web/PWA startup must never depend on it. */
    });
}

/** Android PWA / WebView: same width + safe-area rules as Capacitor iOS shell. */
function configureStandalonePwaShell(): void {
  if (!isStandalonePwa()) return;
  document.documentElement.classList.add("amynest-pwa-standalone");
}

function configureAndroidMobileShell(): void {
  if (!isAndroidMobileShell()) return;

  const root = document.documentElement;
  root.classList.add("amynest-android-shell", "dark");
  root.setAttribute("data-theme", "dark");
  root.style.colorScheme = "dark";
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", "#0b0b0b");
  try {
    window.localStorage.setItem("theme", "dark");
    window.localStorage.removeItem("amynest:theme");
  } catch {
    /* ignore */
  }
}

function listenForServiceWorkerUpdates(
  registration: ServiceWorkerRegistration,
): void {
  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;
    if (!installing) return;

    installing.addEventListener("statechange", () => {
      if (
        installing.state === "installed" &&
        navigator.serviceWorker.controller
      ) {
        // Do not auto-reload here — mid-boot reloads on Android PWA look like a crash.
        // Deploy bumps are handled in syncPwaCacheAndVersion (main.tsx).
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => {
            console.info("[amynest:pwa] Service worker controller changed");
          },
          { once: true },
        );
      }
    });
  });
}

/** When false, skips SW registration (recovery / debugging only). */
const WEB_SERVICE_WORKER_ENABLED = true;

function registerWebServiceWorker(): void {
  if (!WEB_SERVICE_WORKER_ENABLED) return;
  if (!import.meta.env.PROD) return;
  if (!canUseBrowserServiceWorkers()) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const swBase = import.meta.env.BASE_URL.replace(/\/$/, "");
  navigator.serviceWorker
    .register(`${swBase}/sw.js`, {
      scope: `${swBase}/`,
      updateViaCache: "none",
    })
    .then((registration) => {
      listenForServiceWorkerUpdates(registration);
      return registration.update();
    })
    .catch(() => {
      /* Best-effort — app must still load without SW */
    });
}

/**
 * Boot-time native vs web setup. No-op on SSR. On web (Render/PWA) registers
 * the root service worker when appropriate. On Capacitor/Android wrapper, skips
 * SW registration so FCM / native push is not interfered with.
 */
export function initNativeShell(): void {
  if (typeof window === "undefined") return;
  if (nativeShellInitialized) return;
  nativeShellInitialized = true;

  if (isNativeAmyNestShell()) {
    const root = document.documentElement;
    root.classList.add("amynest-native-shell", "dark");
    root.setAttribute("data-theme", "dark");
    root.style.colorScheme = "dark";
    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute("content", "#0b0b0b");
    try {
      window.localStorage.setItem("theme", "dark");
      window.localStorage.removeItem("amynest:theme");
    } catch {
      /* ignore */
    }
    configureNativeViewport();
    configureAndroidMobileShell();
    configureStandalonePwaShell();
    return;
  }

  configureAndroidMobileShell();
  configureStandalonePwaShell();
  registerWebServiceWorker();
}
