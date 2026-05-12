/**
 * Bridge to native push interfaces for all AmyNest native shells.
 *
 * ── ANDROID WebView (kidschedule-android) ────────────────────────────────
 *
 *   NEW APK (v2+, addJavascriptInterface):
 *     window.AndroidPush.getPushToken()        → sync FCM token
 *     window.AndroidPush.getPermissionStatus() → "granted" | "denied" | "default"
 *     window.onAndroidToken(token)             → evaluateJavascript callback
 *
 *   LEGACY APK (v1, addWebMessageListener):
 *     window.AmyNestPushNative.postMessage(json) → send request
 *     window.AmyNestPushNative.onmessage = fn    → receive response
 *     Requests:  { action: "getStatus"|"requestPermission"|"refreshToken", cbId }
 *     Responses: { ok, cbId, data: { fcmEnabled, permission, token } }
 *     Push events: { type: "token"|"permission", token?, permission? }
 *
 * ── iOS Capacitor shell (amynest-capacitor) ──────────────────────────────
 *
 *   Detection:  window.Capacitor?.getPlatform?.() === "ios"
 *   Plugin API: window.Capacitor.Plugins.PushNotifications  (runtime-injected)
 *     .requestPermissions()       → Promise<{ receive: "granted"|"denied"|"prompt" }>
 *     .register()                 → Promise<void>  (triggers "registration" listener)
 *     .addListener("registration", ({ value: token }) => …)
 *     .addListener("registrationError", (err) => …)
 *     .addListener("pushNotificationReceived",  handler)  (foreground)
 *     .addListener("pushNotificationActionPerformed", handler) (tap)
 *
 * ── Wrapper detection signals (checked in order) ─────────────────────────
 *   1. window.Capacitor with platform "ios"  (Capacitor iOS shell)
 *   2. window.AndroidPush                    (new Android APK, bridge ready)
 *   3. window.AmyNestPushNative              (legacy Android APK, bridge ready)
 *   4. window.__AMYNEST_WRAPPER              (document-start marker)
 *   5. navigator.userAgent "AmyNestAndroid"  (last resort)
 *
 * ── Shared event bus ─────────────────────────────────────────────────────
 *   All three bridges dispatch the same CustomEvents so downstream hooks
 *   (usePushRegistration, notification-settings, etc.) work identically:
 *     "amynest-push-token"      — detail: { token: string }
 *     "amynest-push-permission" — detail: { permission: NativePushPermission }
 */

export type NativePushPermission = "granted" | "denied" | "default";

// ── Window augmentations ──────────────────────────────────────────────────

declare global {
  interface Window {
    /** New Android APK (v2+): addJavascriptInterface object. */
    AndroidPush?: {
      getPushToken(): string | null;
      getPermissionStatus?(): string;
    };
    /** Legacy Android APK (v1): addWebMessageListener message-bus object. */
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
    /** Capacitor runtime object injected by the Capacitor shell. */
    Capacitor?: {
      getPlatform(): "ios" | "android" | "web";
      isNativePlatform(): boolean;
      Plugins: {
        PushNotifications?: {
          requestPermissions(): Promise<{ receive: "granted" | "denied" | "prompt" }>;
          register(): Promise<void>;
          addListener(
            event: "registration",
            handler: (token: { value: string }) => void,
          ): Promise<{ remove: () => void }>;
          addListener(
            event: "registrationError",
            handler: (err: { error: string }) => void,
          ): Promise<{ remove: () => void }>;
          addListener(
            event: "pushNotificationReceived",
            handler: (notification: unknown) => void,
          ): Promise<{ remove: () => void }>;
          addListener(
            event: "pushNotificationActionPerformed",
            handler: (action: unknown) => void,
          ): Promise<{ remove: () => void }>;
        };
        /** RevenueCat Purchases plugin — injected by amynest-capacitor shell. */
        Purchases?: {
          configure(opts: { apiKey: string; appUserID?: string }): Promise<void>;
          logIn(opts: { appUserID: string }): Promise<{ customerInfo: unknown; created: boolean }>;
          logOut(): Promise<{ customerInfo: unknown }>;
          getOfferings(): Promise<{ current: unknown; all: Record<string, unknown> }>;
          getCustomerInfo(): Promise<{ customerInfo: unknown }>;
          purchasePackage(opts: { aPackage: unknown }): Promise<{ customerInfo: unknown; transaction: unknown }>;
          restorePurchases(): Promise<{ customerInfo: unknown }>;
        };
      };
    };
  }
}

// ── Module-level state ────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenListenerWired = false;
/** "ios" | "new" | "legacy" | null — which bridge is active */
let activeBridgeKind: "ios" | "new" | "legacy" | null = null;

// ── iOS Capacitor helpers ─────────────────────────────────────────────────

function getCapacitorPlugin() {
  if (typeof window === "undefined") return null;
  return window.Capacitor?.Plugins?.PushNotifications ?? null;
}

export function isCapacitorIOS(): boolean {
  if (typeof window === "undefined") return false;
  const cap = window.Capacitor;
  return !!(cap && cap.isNativePlatform?.() && cap.getPlatform?.() === "ios");
}

let iosPerm: NativePushPermission = "default";
let iosInitialized = false;
let iosInitPromise: Promise<void> | null = null;

/**
 * One-time async init for the Capacitor iOS push bridge.
 * - Requests permission (shows native OS dialog once)
 * - Calls register() to get the APNs/FCM token
 * - Wires the "registration" listener → dispatches amynest-push-token
 *
 * Safe to call multiple times — runs only once per page load.
 */
export async function initCapacitorIOSPush(): Promise<void> {
  if (iosInitialized) return;
  if (iosInitPromise) return iosInitPromise;

  iosInitPromise = (async () => {
    const plugin = getCapacitorPlugin();
    if (!plugin) return;

    activeBridgeKind = "ios";

    // 1. Request permission
    try {
      const result = await plugin.requestPermissions();
      iosPerm = result.receive === "granted" ? "granted"
              : result.receive === "denied"  ? "denied"
              : "default";
      try {
        window.dispatchEvent(
          new CustomEvent("amynest-push-permission", { detail: { permission: iosPerm } }),
        );
      } catch { /* ignore */ }
    } catch {
      iosPerm = "default";
    }

    if (iosPerm !== "granted") {
      iosInitialized = true;
      return;
    }

    // 2. Listen for token before calling register()
    try {
      await plugin.addListener("registration", ({ value: token }) => {
        if (!token) return;
        cachedToken = token;
        try {
          window.dispatchEvent(
            new CustomEvent("amynest-push-token", { detail: { token } }),
          );
        } catch { /* ignore */ }
      });

      await plugin.addListener("registrationError", (err) => {
        console.warn("[CapacitorPush] registration error:", err);
      });

      // 3. Foreground notification listener (show in-app toast/banner)
      await plugin.addListener("pushNotificationReceived", (notification) => {
        try {
          window.dispatchEvent(
            new CustomEvent("amynest-push-foreground", { detail: notification }),
          );
        } catch { /* ignore */ }
      });

      // 4. Notification tap listener — navigate to the deep-link screen
      await plugin.addListener("pushNotificationActionPerformed", (action) => {
        try {
          const a = action as {
            notification?: { data?: { deepLink?: string; category?: string } };
          };
          const deepLink = a.notification?.data?.deepLink ?? "";
          const category = a.notification?.data?.category;
          import("@/lib/notification-deep-link").then(({ dispatchNotifDeepLink }) => {
            dispatchNotifDeepLink(deepLink, category);
          }).catch(() => { /* ignore */ });
        } catch { /* ignore */ }
      });
    } catch { /* ignore */ }

    // 4. Register (triggers "registration" listener above)
    try {
      await plugin.register();
    } catch (e) {
      console.warn("[CapacitorPush] register() failed:", e);
    }

    iosInitialized = true;
  })();

  return iosInitPromise;
}

// ── Android new-bridge helpers ────────────────────────────────────────────

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

function wireTokenListenerOnce() {
  if (tokenListenerWired || typeof window === "undefined") return;
  tokenListenerWired = true;
  window.addEventListener("amynest-push-token", (e: Event) => {
    const detail = (e as CustomEvent<{ token: string }>).detail;
    if (detail?.token) cachedToken = detail.token;
  });
}

// ── Android legacy-bridge helpers ─────────────────────────────────────────

function getLegacyBridge(): Window["AmyNestPushNative"] | null {
  if (typeof window === "undefined") return null;
  const b = window.AmyNestPushNative;
  if (!b || typeof b.postMessage !== "function") return null;
  return b;
}

let legacyCachedPermission: NativePushPermission = "default";
let legacyMsgListenerInstalled = false;

function installLegacyMessageListener() {
  if (legacyMsgListenerInstalled) return;
  const bridge = getLegacyBridge();
  if (!bridge) return;
  legacyMsgListenerInstalled = true;

  bridge.onmessage = (event: { data: string }) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "token" && msg.token) {
        cachedToken = msg.token;
        try {
          window.dispatchEvent(
            new CustomEvent("amynest-push-token", { detail: { token: msg.token } }),
          );
        } catch { /* ignore */ }
      }
      if (msg.type === "permission" && msg.permission) {
        legacyCachedPermission = msg.permission as NativePushPermission;
        try {
          window.dispatchEvent(
            new CustomEvent("amynest-push-permission", { detail: { permission: msg.permission } }),
          );
        } catch { /* ignore */ }
        if (msg.permission === "granted" && msg.token) {
          cachedToken = msg.token;
          try {
            window.dispatchEvent(
              new CustomEvent("amynest-push-token", { detail: { token: msg.token } }),
            );
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
  };
}

function getStatusFromLegacy(): Promise<{
  fcmEnabled: boolean;
  permission: NativePushPermission;
  token: string | null;
} | null> {
  const bridge = getLegacyBridge();
  if (!bridge) return Promise.resolve(null);

  return new Promise((resolve) => {
    const cbId = `compat_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const timer = window.setTimeout(() => { resolve(null); }, 5_000);

    const prevOnMessage = bridge.onmessage;
    bridge.onmessage = (event: { data: string }) => {
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
                ? d.permission : "default";
            legacyCachedPermission = perm;
            if (d.token) cachedToken = d.token;
            resolve({ fcmEnabled: !!d.fcmEnabled, permission: perm, token: d.token ?? cachedToken });
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
  /** "ios" for Capacitor iOS shell, "android" for both Android APK generations */
  platform: "ios" | "android";
}

/**
 * Return a bridge facade if any native shell is detected.
 * Priority: Capacitor iOS → Android new APK → Android legacy APK
 */
export function getNativePushBridge(): NativePushFacade | null {
  // ── Capacitor iOS ────────────────────────────────────────────────────────
  if (isCapacitorIOS()) {
    activeBridgeKind = "ios";
    return {
      platform: "ios",
      getFcmEnabled: () => true,
      getPermissionStatus: () => iosPerm,
      getToken: () => cachedToken,
    };
  }

  // ── Android new APK ──────────────────────────────────────────────────────
  const ap = getAndroidPush();
  if (ap) {
    activeBridgeKind = "new";
    wireTokenListenerOnce();
    return {
      platform: "android",
      getFcmEnabled: () => true,
      getPermissionStatus: () => readPermissionNew(),
      getToken: () => tryGetTokenNew(),
    };
  }

  // ── Android legacy APK ───────────────────────────────────────────────────
  const legacy = getLegacyBridge();
  if (legacy) {
    activeBridgeKind = "legacy";
    installLegacyMessageListener();
    return {
      platform: "android",
      getFcmEnabled: () => true,
      getPermissionStatus: () => legacyCachedPermission,
      getToken: () => cachedToken,
    };
  }

  return null;
}

/**
 * Hydrate the module cache and return the current native push status.
 * For iOS Capacitor: runs the async init (permission request + register).
 * For Android new APK: drains __pendingAndroidToken buffer.
 * For Android legacy APK: sends getStatus and awaits the response.
 */
export async function ensureNativePushReady(): Promise<{
  fcmEnabled: boolean;
  permission: NativePushPermission;
  token: string | null;
} | null> {
  // ── Capacitor iOS ────────────────────────────────────────────────────────
  if (isCapacitorIOS()) {
    activeBridgeKind = "ios";
    await initCapacitorIOSPush();
    return { fcmEnabled: true, permission: iosPerm, token: cachedToken };
  }

  // ── Android new APK ──────────────────────────────────────────────────────
  const ap = getAndroidPush();
  if (ap) {
    activeBridgeKind = "new";
    wireTokenListenerOnce();
    const permission = readPermissionNew();
    const fromBridge = tryGetTokenNew();
    const pending = typeof window !== "undefined" ? window.__pendingAndroidToken : null;
    if (pending && !cachedToken) {
      cachedToken = pending;
      if (typeof window !== "undefined") window.__pendingAndroidToken = null;
    }
    return { fcmEnabled: true, permission, token: cachedToken ?? fromBridge };
  }

  // ── Android legacy APK ───────────────────────────────────────────────────
  const legacy = getLegacyBridge();
  if (legacy) {
    activeBridgeKind = "legacy";
    installLegacyMessageListener();
    const status = await getStatusFromLegacy();
    if (status) return status;
    return { fcmEnabled: true, permission: legacyCachedPermission, token: cachedToken };
  }

  return null;
}

/**
 * Detect "are we inside ANY AmyNest native shell?"
 * (Capacitor iOS OR Android WebView wrapper)
 */
export function isAmyNestWrapper(): boolean {
  if (typeof window === "undefined") return false;
  if (isCapacitorIOS()) return true;                                          // Capacitor iOS
  if (typeof window.AndroidPush !== "undefined") return true;                 // new Android APK
  if (typeof window.AmyNestPushNative !== "undefined") return true;           // legacy Android APK
  if (typeof window.__AMYNEST_WRAPPER === "string") return true;              // document-start marker
  if (typeof navigator !== "undefined" && /AmyNestAndroid/.test(navigator.userAgent)) return true;
  return false;
}

/**
 * Poll for any bridge to appear, up to timeoutMs.
 * For Capacitor iOS, the bridge is synchronously available so this resolves immediately.
 */
export function awaitNativePushBridge(timeoutMs = 5_000): Promise<NativePushFacade | null> {
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
  if (isCapacitorIOS()) return "capacitor-ios";
  return typeof window.__AMYNEST_WRAPPER === "string"
    ? window.__AMYNEST_WRAPPER
    : null;
}

/**
 * Request push permission from whichever native bridge is active.
 *
 * iOS Capacitor: already handled inside initCapacitorIOSPush() — returns current state.
 * Android new APK: OS dialog is triggered natively — returns current state.
 * Android legacy APK: sends requestPermission action and waits for the OS result.
 */
export function requestNativePushPermission(
  _facade: NativePushFacade,
  timeoutMs = 60_000,
): Promise<NativePushPermission> {
  // iOS — run (or re-use) the init which triggers the native OS dialog.
  // initCapacitorIOSPush is idempotent and safe to call multiple times.
  if (activeBridgeKind === "ios" || isCapacitorIOS()) {
    return initCapacitorIOSPush().then(() => iosPerm);
  }

  // Android new APK — OS dialog is triggered natively
  if (activeBridgeKind === "new") {
    return Promise.resolve(readPermissionNew());
  }

  // Android legacy APK
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
      resolve(p === "granted" || p === "denied" || p === "default" ? p : legacyCachedPermission);
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
 * Get the native push token. Returns immediately if the cache is warm.
 * For iOS Capacitor, the token arrives via the "registration" listener wired in init.
 */
export async function getNativePushToken(
  _facade: NativePushFacade,
  timeoutMs = 15_000,
): Promise<string | null> {
  if (cachedToken) return cachedToken;

  // iOS / Android new APK: wait for amynest-push-token CustomEvent
  if (activeBridgeKind === "ios" || activeBridgeKind === "new" || getAndroidPush()) {
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

  // Android legacy APK: request token via message protocol
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
 * High-level helper: get the native push token and POST it to
 * `/api/push/register`. Platform is auto-detected ("ios" or "android").
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
        platform: facade.platform === "ios" ? "ios-capacitor" : "android",
        deviceName: facade.platform === "ios" ? "AmyNest iOS" : "KidSchedule Android",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
