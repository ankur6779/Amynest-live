/**
 * Bridge to the native FCM push interface exposed by the KidSchedule
 * Android WebView wrapper.
 *
 * Transport — two layers work together:
 *
 *   1. `window.AndroidPush`  (addJavascriptInterface)
 *      Synchronous JS object injected by the native side. Exposes:
 *        • `getPushToken()` → cached FCM token string or null
 *        • `getPermissionStatus()` → "granted" | "denied" | "default"
 *
 *   2. `window.onAndroidToken(token)`  (evaluateJavascript callback)
 *      Called by the native side whenever a fresh FCM token is available.
 *      Defined in index.html's inline script so it is ready BEFORE React
 *      mounts; it buffers the token in `window.__pendingAndroidToken` and
 *      fires a `"amynest-push-token"` CustomEvent so mounted hooks are
 *      also notified.
 *
 * This module wires those two transport layers into the same `NativePushFacade`
 * API surface that the rest of the app already uses, so no callers outside
 * this file and `use-push-registration.ts` need to change.
 *
 * Wrapper detection uses ANY of:
 *   1. `window.AndroidPush` present (full bridge ready)
 *   2. `window.__AMYNEST_WRAPPER` marker (injected at document_start,
 *      present even when addJavascriptInterface objects are delayed)
 *   3. `navigator.userAgent` containing "AmyNestAndroid" (last-resort)
 */

export type NativePushPermission = "granted" | "denied" | "default";

declare global {
  interface Window {
    /**
     * Synchronous JavascriptInterface object injected by the Android wrapper.
     * Exposed as `window.AndroidPush` via WebView.addJavascriptInterface().
     */
    AndroidPush?: {
      getPushToken(): string | null;
      getPermissionStatus?(): string;
    };
    /**
     * Synchronous wrapper-version marker injected at document_start by
     * addDocumentStartJavaScript — present even before AndroidPush wires up.
     */
    __AMYNEST_WRAPPER?: string;
    /**
     * Buffered FCM token written by window.onAndroidToken() before React
     * mounts. Cleared by use-push-registration.ts on first read.
     */
    __pendingAndroidToken?: string | null;
    /**
     * Entry point called by the Android wrapper via evaluateJavascript when
     * the FCM token is available. Defined in index.html's early inline script.
     */
    onAndroidToken?: (token: string) => void;
  }
}

// ── Module-level state ────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenListenerWired = false;

// ── Internal helpers ──────────────────────────────────────────────────────

function getAndroidPush(): Window["AndroidPush"] | null {
  if (typeof window === "undefined") return null;
  const ap = window.AndroidPush;
  if (!ap || typeof ap.getPushToken !== "function") return null;
  return ap;
}

function readPermission(): NativePushPermission {
  const ap = getAndroidPush();
  if (!ap) return "default";
  try {
    const raw = ap.getPermissionStatus?.();
    if (raw === "granted" || raw === "denied" || raw === "default") return raw;
  } catch {
    /* ignore */
  }
  // If a token exists the user must have granted permission.
  return tryGetToken() ? "granted" : "default";
}

function tryGetToken(): string | null {
  if (cachedToken) return cachedToken;
  const ap = getAndroidPush();
  if (!ap) return null;
  try {
    const t = ap.getPushToken();
    if (t) {
      cachedToken = t;
      return t;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Wire the `amynest-push-token` CustomEvent listener once (module singleton). */
function wireTokenListenerOnce() {
  if (tokenListenerWired || typeof window === "undefined") return;
  tokenListenerWired = true;
  window.addEventListener("amynest-push-token", (e: Event) => {
    const detail = (e as CustomEvent<{ token: string }>).detail;
    if (detail?.token) cachedToken = detail.token;
  });
}

// ── Public API ────────────────────────────────────────────────────────────

/** Facade returned to callers; same interface as before — no breaking change. */
export interface NativePushFacade {
  getFcmEnabled(): boolean;
  getPermissionStatus(): NativePushPermission;
  getToken(): string | null;
}

/**
 * Lightweight, synchronous detection: returns the bridge facade only when
 * `window.AndroidPush` is wired up. The facade's sync accessors are backed
 * by the module-level cache populated during the last `ensureNativePushReady`
 * call; callers who need correctness on first paint should await that first.
 */
export function getNativePushBridge(): NativePushFacade | null {
  const ap = getAndroidPush();
  if (!ap) return null;
  wireTokenListenerOnce();
  return {
    getFcmEnabled: () => true,
    getPermissionStatus: () => readPermission(),
    getToken: () => tryGetToken(),
  };
}

/**
 * Drain the `__pendingAndroidToken` buffer (written before React mounted)
 * and hydrate the module cache. Returns the current status object.
 */
export async function ensureNativePushReady(): Promise<{
  fcmEnabled: boolean;
  permission: NativePushPermission;
  token: string | null;
} | null> {
  const ap = getAndroidPush();
  if (!ap) return null;
  wireTokenListenerOnce();
  const permission = readPermission();
  const fromBridge = tryGetToken();
  const pending =
    typeof window !== "undefined" ? window.__pendingAndroidToken : null;
  if (pending && !cachedToken) {
    cachedToken = pending;
    // Clear so the pending token isn't drained a second time.
    if (typeof window !== "undefined") window.__pendingAndroidToken = null;
  }
  return { fcmEnabled: true, permission, token: cachedToken ?? fromBridge };
}

/**
 * Synchronous detection of "are we inside the AmyNest Android wrapper?"
 * Checks all three signals in priority order.
 */
export function isAmyNestWrapper(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.AndroidPush !== "undefined") return true;
  if (typeof window.__AMYNEST_WRAPPER === "string") return true;
  if (
    typeof navigator !== "undefined" &&
    /AmyNestAndroid/.test(navigator.userAgent)
  ) {
    return true;
  }
  return false;
}

/**
 * Poll for `window.AndroidPush` to appear within `timeoutMs`, then return
 * the bridge facade. Returns immediately with `null` outside the wrapper.
 *
 * Why polling: addJavascriptInterface objects are available before the page
 * loads, but on some devices there is a brief gap before the first JS
 * execution sees them. The wrapper marker (`__AMYNEST_WRAPPER`) is the
 * bulletproof signal that we should wait.
 */
export function awaitNativePushBridge(
  timeoutMs = 5_000,
): Promise<NativePushFacade | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }
    const immediate = getNativePushBridge();
    if (immediate) {
      resolve(immediate);
      return;
    }
    if (!isAmyNestWrapper()) {
      resolve(null);
      return;
    }
    const start = Date.now();
    const tick = () => {
      const facade = getNativePushBridge();
      if (facade) {
        resolve(facade);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, 200);
    };
    tick();
  });
}

/** Read the wrapper version marker, or null when not in the wrapper. */
export function getWrapperVersion(): string | null {
  if (typeof window === "undefined") return null;
  return typeof window.__AMYNEST_WRAPPER === "string"
    ? window.__AMYNEST_WRAPPER
    : null;
}

/**
 * With the AndroidPush bridge, permission is requested natively by the
 * wrapper on app launch (and re-synced on every onResume). This function
 * resolves immediately with the current OS permission state rather than
 * attempting to trigger a native dialog from JS.
 */
export function requestNativePushPermission(
  _facade: NativePushFacade,
  _timeoutMs = 60_000,
): Promise<NativePushPermission> {
  return Promise.resolve(readPermission());
}

/**
 * Get the native FCM token. Returns immediately if the cache is warm;
 * otherwise waits up to `timeoutMs` for the `amynest-push-token` event
 * fired by `window.onAndroidToken` (which the native side calls via
 * evaluateJavascript once the FCM token is available).
 */
export async function getNativePushToken(
  _facade: NativePushFacade,
  timeoutMs = 15_000,
): Promise<string | null> {
  const immediate = tryGetToken();
  if (immediate) return immediate;

  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      window.removeEventListener("amynest-push-token", onToken);
      resolve(cachedToken ?? null);
    }, timeoutMs);

    const onToken = (e: Event) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener("amynest-push-token", onToken);
      const detail = (e as CustomEvent<{ token: string }>).detail;
      if (detail?.token) cachedToken = detail.token;
      resolve(cachedToken ?? null);
    };

    window.addEventListener("amynest-push-token", onToken);
  });
}

/**
 * High-level helper: obtain the native FCM token and POST it to
 * `/api/push/register` with `platform="android"`. Returns true when the
 * server accepted the registration.
 */
export async function registerNativePushToken(
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  apiUrl: string,
): Promise<boolean> {
  const facade = getNativePushBridge();
  if (!facade) return false;
  await ensureNativePushReady();
  if (facade.getPermissionStatus() !== "granted") return false;
  const token = await getNativePushToken(facade);
  if (!token) return false;
  try {
    const res = await authFetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        platform: "android",
        deviceName: "KidSchedule Android",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
