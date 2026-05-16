/**
 * Runtime native vs web detection. Safe to import in Vite web builds — no
 * Capacitor-only modules are loaded at the top level.
 */

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

/** Browser PWA service workers — disabled inside native WebViews. */
export function canUseBrowserServiceWorkers(): boolean {
  return hasServiceWorkerOrigin() && !isNativeAmyNestShell();
}

let nativeShellInitialized = false;

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
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => {
            window.location.reload();
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
    document.documentElement.classList.add("amynest-native-shell");
    return;
  }

  registerWebServiceWorker();
}
