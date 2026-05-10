/**
 * Bridge to the native FCM push interface exposed by the KidSchedule
 * Android WebView wrapper.
 *
 * Two APK generations are supported simultaneously so a web deploy never
 * breaks users who haven't yet updated the native app:
 *
 * ── NEW APK (v2+, addJavascriptInterface) ────────────────────────────────
 *
 *   window.AndroidPush.getPushToken()        → sync pull of cached FCM token
 *   window.AndroidPush.getPermissionStatus() → "granted" | "denied" | "default"
 *   window.onAndroidToken(token)             → called by native via evaluateJavascript
 *
 * ── LEGACY APK (v1, addWebMessageListener) ───────────────────────────────
 *
 *   window.AmyNestPushNative.postMessage(json) → send request to native
 *   window.AmyNestPushNative.onmessage = fn   → receive responses from native
 *
 *   Request:  { action: "getStatus", cbId: string }
 *   Response: { ok: true, cbId, data: { fcmEnabled, permission, token } }
 *   Push:     { type: "token", token: string }
 *             { type: "permission", permission: string }
 *
 * ── Wrapper detection (all three signals checked in order) ───────────────
 *   1. window.AndroidPush         (new APK, full bridge ready)
 *   2. window.AmyNestPushNative   (legacy APK, full bridge ready)
 *   3. window.__AMYNEST_WRAPPER   (document-start marker, present before bridge wires up)
 *   4. navigator.userAgent "AmyNestAndroid" (last resort)
 */

export type NativePushPermission = "granted" | "denied" | "default";

declare global {
  interface Window {
    /** New APK (v2+): addJavascriptInterface object. */
    AndroidPush?: {
      getPushToken(): string | null;
      getPermissionStatus?(): string;
    };
    /** Legacy APK (v1): addWebMessageListener message-bus object. */
    AmyNestPushNative?: {
      postMessage(data: string): void;
      onmessage?: ((event: { data: string }) => void) | null;
    };
    /** Sync wrapper-version marker injected at document_start. */
    __AMYNEST_WRAPPER?: string;
    /** Buffered FCM token written by window.onAndroidToken() before React mounts. */
    __pendingAndroidToken?: string | null;
    /** Callback invoked by new APK via evaluateJavascript when token is ready. */
    onAndroidToken?: (token: string) => void;
  }
}

// ── Module-level state ────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenListenerWired = false;
/** "new" | "legacy" | null — which bridge is active */
let activeBridgeKind: "new" | "legacy" | null = null;

// ── New bridge helpers ────────────────────────────────────────────────────

function getAndroidPush(): Window["AndroidPush"] | null {
  if (typeof window === "undefined") return null;
  const ap = window.AndroidPush;
  if (!ap || typeof ap.getPushToken !== "function") return null;
  return ap;
}

function readPermissionNew(): NativePushPermission {
  const ap = getAndroidPush();
  if (!ap) return "default";
  try {
    const raw = ap.getPermissionStatus?.();
    if (raw === "granted" || raw === "denied" || raw === "default") return raw;
  } catch { /* ignore */ }
  return cachedToken ? "granted" : "default";
}

function tryGetTokenNew(): string | null {
  if (cachedToken) return cachedToken;
  const ap = getAndroidPush();
  if (!ap) return null;
  try {
    const t = ap.getPushToken();
    if (t) { cachedToken = t; return t; }
  } catch { /* ignore */ }
  return null;
}

/** Wire the amynest-push-token CustomEvent listener once (new-APK path). */
function wireTokenListenerOnce() {
  if (tokenListenerWired || typeof window === "undefined") return;
  tokenListenerWired = true;
  window.addEventListener("amynest-push-token", (e: Event) => {
    const detail = (e as CustomEvent<{ token: string }>).detail;
    if (detail?.token) cachedToken = detail.token;
  });
}

// ── Legacy bridge helpers ─────────────────────────────────────────────────

function getLegacyBridge(): Window["AmyNestPushNative"] | null {
  if (typeof window === "undefined") return null;
  const b = window.AmyNestPushNative;
  if (!b || typeof b.postMessage !== "function") return null;
  return b;
}

let legacyCachedPermission: NativePushPermission = "default";
let legacyMsgListenerInstalled = false;

/**
 * Install a persistent onmessage handler on the legacy bridge that:
 *   • captures out-of-band token rotation events  ({ type: "token" })
 *   • captures out-of-band permission events       ({ type: "permission" })
 *   • dispatches amynest-push-token CustomEvent so the rest of the app
 *     gets the same signal as the new-APK path
 */
function installLegacyMessageListener() {
  if (legacyMsgListenerInstalled) return;
  const bridge = getLegacyBridge();
  if (!bridge) return;
  legacyMsgListenerInstalled = true;

  bridge.onmessage = (event: { data: string }) => {
    try {
      const msg = JSON.parse(event.data);
      // Out-of-band token push
      if (msg.type === "token" && msg.token) {
        cachedToken = msg.token;
        try {
          window.dispatchEvent(
            new CustomEvent("amynest-push-token", { detail: { token: msg.token } })
          );
        } catch { /* ignore */ }
      }
      // Out-of-band permission push
      if (msg.type === "permission" && msg.permission) {
        legacyCachedPermission = msg.permission as NativePushPermission;
        try {
          window.dispatchEvent(
            new CustomEvent("amynest-push-permission", { detail: { permission: msg.permission } })
          );
        } catch { /* ignore */ }
        // If permission was just granted and a token arrives separately,
        // the token push event above will handle it. If it's inline, grab it.
        if (msg.permission === "granted" && msg.token) {
          cachedToken = msg.token;
          try {
            window.dispatchEvent(
              new CustomEvent("amynest-push-token", { detail: { token: msg.token } })
            );
          } catch { /* ignore */ }
        }
      }
      // getStatus response (cbId-based — handled by getStatusFromLegacy)
    } catch { /* ignore */ }
  };
}

/**
 * Send a getStatus request to the legacy bridge and resolve with the
 * status data. Times out after 5 s to prevent hanging.
 */
function getStatusFromLegacy(): Promise<{
  fcmEnabled: boolean;
  permission: NativePushPermission;
  token: string | null;
} | null> {
  const bridge = getLegacyBridge();
  if (!bridge) return Promise.resolve(null);

  return new Promise((resolve) => {
    const cbId = `compat_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const timer = window.setTimeout(() => {
      resolve(null);
    }, 5_000);

    const prevOnMessage = bridge.onmessage;
    bridge.onmessage = (event: { data: string }) => {
      // Forward to persistent listener first
      try { prevOnMessage?.(event); } catch { /* ignore */ }
      try {
        const msg = JSON.parse(event.data);
        if (msg.cbId === cbId) {
          window.clearTimeout(timer);
          bridge.onmessage = prevOnMessage ?? null;
          if (msg.ok && msg.data) {
            const d = msg.data;
            const perm: NativePushPermission =
              d.permission === "granted" || d.permission === "denied"
                ? d.permission
                : "default";
            legacyCachedPermission = perm;
            if (d.token) cachedToken = d.token;
            resolve({
              fcmEnabled: !!d.fcmEnabled,
              permission: perm,
              token: d.token ?? cachedToken,
            });
          } else {
            resolve(null);
          }
        }
      } catch { /* ignore */ }
    };

    try {
      bridge.postMessage(JSON.stringify({ action: "getStatus", cbId }));
    } catch {
      window.clearTimeout(timer);
      bridge.onmessage = prevOnMessage ?? null;
      resolve(null);
    }
  });
}

// ── Public API ────────────────────────────────────────────────────────────

export interface NativePushFacade {
  getFcmEnabled(): boolean;
  getPermissionStatus(): NativePushPermission;
  getToken(): string | null;
}

/**
 * Return a bridge facade if either the new (AndroidPush) or legacy
 * (AmyNestPushNative) bridge is available. Returns null outside the wrapper.
 *
 * Call order:
 *   1. New bridge (window.AndroidPush) — preferred
 *   2. Legacy bridge (window.AmyNestPushNative) — fallback for old APK
 */
export function getNativePushBridge(): NativePushFacade | null {
  // ── New bridge ──────────────────────────────────────────────────────────
  const ap = getAndroidPush();
  if (ap) {
    activeBridgeKind = "new";
    wireTokenListenerOnce();
    return {
      getFcmEnabled: () => true,
      getPermissionStatus: () => readPermissionNew(),
      getToken: () => tryGetTokenNew(),
    };
  }

  // ── Legacy bridge ───────────────────────────────────────────────────────
  const legacy = getLegacyBridge();
  if (legacy) {
    activeBridgeKind = "legacy";
    installLegacyMessageListener();
    return {
      getFcmEnabled: () => true,
      getPermissionStatus: () => legacyCachedPermission,
      getToken: () => cachedToken,
    };
  }

  return null;
}

/**
 * Hydrate the module cache and return the current native push status.
 *
 * For the new bridge: drains __pendingAndroidToken buffer.
 * For the legacy bridge: sends a getStatus message and awaits the response.
 *
 * Returns null if neither bridge is available (not inside the wrapper).
 */
export async function ensureNativePushReady(): Promise<{
  fcmEnabled: boolean;
  permission: NativePushPermission;
  token: string | null;
} | null> {
  // ── New bridge ──────────────────────────────────────────────────────────
  const ap = getAndroidPush();
  if (ap) {
    activeBridgeKind = "new";
    wireTokenListenerOnce();
    const permission = readPermissionNew();
    const fromBridge = tryGetTokenNew();
    const pending =
      typeof window !== "undefined" ? window.__pendingAndroidToken : null;
    if (pending && !cachedToken) {
      cachedToken = pending;
      if (typeof window !== "undefined") window.__pendingAndroidToken = null;
    }
    return { fcmEnabled: true, permission, token: cachedToken ?? fromBridge };
  }

  // ── Legacy bridge ───────────────────────────────────────────────────────
  const legacy = getLegacyBridge();
  if (legacy) {
    activeBridgeKind = "legacy";
    installLegacyMessageListener();
    const status = await getStatusFromLegacy();
    if (status) return status;
    // If getStatus timed out, return what we have cached.
    return {
      fcmEnabled: true,
      permission: legacyCachedPermission,
      token: cachedToken,
    };
  }

  return null;
}

/**
 * Detect "are we inside the AmyNest Android wrapper?"
 * Checks all four signals in priority order so both old and new APKs are
 * recognised even before their respective bridge objects wire up.
 */
export function isAmyNestWrapper(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.AndroidPush !== "undefined") return true;         // new APK, bridge ready
  if (typeof window.AmyNestPushNative !== "undefined") return true;   // legacy APK, bridge ready
  if (typeof window.__AMYNEST_WRAPPER === "string") return true;      // document-start marker
  if (
    typeof navigator !== "undefined" &&
    /AmyNestAndroid/.test(navigator.userAgent)
  ) return true;                                                        // UA fallback
  return false;
}

/**
 * Poll for either bridge (new or legacy) to appear, up to timeoutMs.
 * Returns immediately with null when not inside the wrapper at all.
 */
export function awaitNativePushBridge(
  timeoutMs = 5_000,
): Promise<NativePushFacade | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(null); return; }

    const immediate = getNativePushBridge();
    if (immediate) { resolve(immediate); return; }

    if (!isAmyNestWrapper()) { resolve(null); return; }

    const start = Date.now();
    const tick = () => {
      const facade = getNativePushBridge();
      if (facade) { resolve(facade); return; }
      if (Date.now() - start >= timeoutMs) { resolve(null); return; }
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
 * With the new AndroidPush bridge, permission is requested natively on app
 * launch and resolves immediately from the synchronous interface.
 *
 * With the legacy bridge, this sends a `requestPermission` action and waits
 * for the OS dialog result (up to timeoutMs).
 */
export function requestNativePushPermission(
  _facade: NativePushFacade,
  timeoutMs = 60_000,
): Promise<NativePushPermission> {
  // New APK — OS dialog is triggered natively; just return current state.
  if (activeBridgeKind === "new") {
    return Promise.resolve(readPermissionNew());
  }

  // Legacy APK — request via message protocol and wait for permission event.
  const bridge = getLegacyBridge();
  if (!bridge) return Promise.resolve("default");

  return new Promise((resolve) => {
    const cbId = `perm_${Date.now()}`;
    let settled = false;

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      window.removeEventListener("amynest-push-permission", onPermEvt);
      resolve(legacyCachedPermission);
    }, timeoutMs);

    const onPermEvt = (e: Event) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener("amynest-push-permission", onPermEvt);
      const p = (e as CustomEvent<{ permission: string }>).detail?.permission;
      if (p === "granted" || p === "denied" || p === "default") {
        resolve(p);
      } else {
        resolve(legacyCachedPermission);
      }
    };

    window.addEventListener("amynest-push-permission", onPermEvt);

    try {
      bridge.postMessage(JSON.stringify({ action: "requestPermission", cbId }));
    } catch {
      window.clearTimeout(timer);
      window.removeEventListener("amynest-push-permission", onPermEvt);
      resolve(legacyCachedPermission);
    }
  });
}

/**
 * Get the native FCM token. Returns immediately if the cache is warm.
 * For the new APK, waits for the amynest-push-token event (evaluateJavascript).
 * For the legacy APK, sends a refreshToken action and waits for the response.
 */
export async function getNativePushToken(
  _facade: NativePushFacade,
  timeoutMs = 15_000,
): Promise<string | null> {
  if (cachedToken) return cachedToken;

  // New bridge: wait for onAndroidToken to fire via CustomEvent.
  if (activeBridgeKind === "new" || getAndroidPush()) {
    return new Promise((resolve) => {
      if (typeof window === "undefined") { resolve(null); return; }
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

  // Legacy bridge: try refreshToken action.
  const bridge = getLegacyBridge();
  if (!bridge) return null;

  return new Promise((resolve) => {
    const cbId = `tok_${Date.now()}`;
    let settled = false;

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      window.removeEventListener("amynest-push-token", onTokEvt);
      resolve(cachedToken ?? null);
    }, timeoutMs);

    const onTokEvt = (e: Event) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener("amynest-push-token", onTokEvt);
      const detail = (e as CustomEvent<{ token: string }>).detail;
      if (detail?.token) cachedToken = detail.token;
      resolve(cachedToken ?? null);
    };

    window.addEventListener("amynest-push-token", onTokEvt);

    try {
      bridge.postMessage(JSON.stringify({ action: "refreshToken", cbId }));
    } catch {
      window.clearTimeout(timer);
      window.removeEventListener("amynest-push-token", onTokEvt);
      resolve(cachedToken ?? null);
    }
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
