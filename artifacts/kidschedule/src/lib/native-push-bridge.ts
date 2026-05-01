/**
 * Bridge to the native FCM push interface exposed by the KidSchedule
 * Android WebView wrapper (see `artifacts/kidschedule-android/.../PushBridge.kt`).
 *
 * The Android WebView has no Web Notification / PushManager / Service Worker
 * push support, so when the web app is loaded inside the wrapper, it must
 * use the device's native FCM token + Android 13+ runtime notification
 * permission instead of standard Web Push.
 *
 * Transport: the native side installs `window.AmyNestPushNative` via
 * `WebViewCompat.addWebMessageListener` with a strict allowed-origin rule,
 * so third-party iframes loaded inside the WebView CANNOT call this
 * bridge. Same security model as `BillingBridge` — origin is enforced at
 * the message-bus level (NOT just navigation allowlist).
 *
 * This adapter owns a module-level singleton state cache so the rest of
 * the web app can call `getNativePushBridge()?.getPermissionStatus()` /
 * `getToken()` synchronously. The cache is hydrated lazily on first call
 * by issuing a `getStatus` request and waiting for the response.
 *
 * Exposed window events (for legacy callers that prefer DOM events):
 *   - "amynest-push-token"      → detail: { token: string }
 *   - "amynest-push-permission" → detail: { status: "granted"|"denied" }
 */

export type NativePushPermission = "granted" | "denied" | "default";

interface NativeStatus {
  fcmEnabled: boolean;
  permission: NativePushPermission;
  token: string | null;
}

interface RawMessageBus {
  postMessage: (data: string) => void;
  addEventListener: (type: "message", listener: (ev: MessageEvent) => void) => void;
  removeEventListener?: (type: "message", listener: (ev: MessageEvent) => void) => void;
  // Legacy onmessage assignment fallback (older WebView Compat builds)
  onmessage?: ((ev: MessageEvent) => void) | null;
}

declare global {
  interface Window {
    AmyNestPushNative?: RawMessageBus;
  }
}

// ── Module-level singleton state ─────────────────────────────────────────

let cached: NativeStatus | null = null;
let initPromise: Promise<NativeStatus | null> | null = null;
let messagesWired = false;
const pendingCallbacks = new Map<
  string,
  (response: { ok: boolean; data?: NativeStatus; error?: string }) => void
>();
const pendingPermissionResolvers: Array<(p: NativePushPermission) => void> = [];

let cbCounter = 0;
function nextCbId(): string {
  cbCounter += 1;
  return `pb_${Date.now()}_${cbCounter}`;
}

function getRawBus(): RawMessageBus | null {
  if (typeof window === "undefined") return null;
  const bus = window.AmyNestPushNative;
  if (!bus || typeof bus.postMessage !== "function") return null;
  return bus;
}

function wireBusListenerOnce(bus: RawMessageBus) {
  if (messagesWired) return;
  messagesWired = true;

  const handle = (ev: MessageEvent) => {
    let payload: unknown;
    try {
      payload = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
    } catch {
      return;
    }
    if (!payload || typeof payload !== "object") return;
    const obj = payload as Record<string, unknown>;

    // Out-of-band push events (token rotation, permission result).
    const type = obj.type;
    if (type === "token" && typeof obj.token === "string" && obj.token) {
      const token = obj.token;
      if (!cached) {
        cached = { fcmEnabled: true, permission: "granted", token };
      } else {
        cached = { ...cached, token };
      }
      try {
        window.dispatchEvent(
          new CustomEvent("amynest-push-token", { detail: { token } }),
        );
      } catch { /* ignore */ }
      return;
    }
    if (type === "permission" && typeof obj.permission === "string") {
      const perm = obj.permission as NativePushPermission;
      if (cached) cached = { ...cached, permission: perm };
      // Resolve any awaiting requestPermission() promises.
      while (pendingPermissionResolvers.length > 0) {
        const r = pendingPermissionResolvers.shift();
        if (r) r(perm);
      }
      try {
        window.dispatchEvent(
          new CustomEvent("amynest-push-permission", { detail: { status: perm } }),
        );
      } catch { /* ignore */ }
      return;
    }

    // Callback responses to outbound action messages.
    const cbId = typeof obj.cbId === "string" ? obj.cbId : "";
    if (cbId && pendingCallbacks.has(cbId)) {
      const cb = pendingCallbacks.get(cbId)!;
      pendingCallbacks.delete(cbId);
      cb({
        ok: obj.ok === true,
        data: obj.data as NativeStatus | undefined,
        error: typeof obj.error === "string" ? obj.error : undefined,
      });
    }
  };

  if (typeof bus.addEventListener === "function") {
    bus.addEventListener("message", handle);
  } else {
    bus.onmessage = handle;
  }
}

function sendAction(
  bus: RawMessageBus,
  action: string,
  timeoutMs = 8_000,
): Promise<NativeStatus | null> {
  return new Promise((resolve) => {
    const cbId = nextCbId();
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      pendingCallbacks.delete(cbId);
      resolve(null);
    }, timeoutMs);
    pendingCallbacks.set(cbId, (resp) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (resp.ok && resp.data) {
        cached = resp.data;
        resolve(resp.data);
      } else {
        resolve(null);
      }
    });
    try {
      bus.postMessage(JSON.stringify({ action, cbId }));
    } catch {
      settled = true;
      window.clearTimeout(timer);
      pendingCallbacks.delete(cbId);
      resolve(null);
    }
  });
}

/**
 * Initialise the bridge — wires the message listener and fetches the
 * initial status (fcmEnabled + permission + token). Idempotent: subsequent
 * calls return the same in-flight promise / cached result.
 */
async function ensureInitialised(bus: RawMessageBus): Promise<NativeStatus | null> {
  wireBusListenerOnce(bus);
  if (cached) return cached;
  if (!initPromise) {
    initPromise = sendAction(bus, "getStatus").then((status) => {
      // If FCM is disabled (no google-services.json), null out cached.token
      // but keep the cached object so subsequent calls do not re-issue.
      if (status) cached = status;
      return status;
    });
  }
  return initPromise;
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Lightweight, synchronous detection: returns the bridge facade only when
 * the wrapper has installed `window.AmyNestPushNative`. The returned
 * facade exposes sync `getPermissionStatus()` / `getToken()` accessors
 * backed by the cache; callers who care about correctness on first paint
 * should `await ensureNativePushReady()` first.
 */
export interface NativePushFacade {
  getFcmEnabled(): boolean;
  getPermissionStatus(): NativePushPermission;
  getToken(): string | null;
}

export function getNativePushBridge(): NativePushFacade | null {
  const bus = getRawBus();
  if (!bus) return null;
  // Kick off (but do NOT await) initialisation so the cache is populated
  // for the next call. Render-time consumers fall through with sensible
  // defaults until the first message arrives.
  void ensureInitialised(bus);
  return {
    getFcmEnabled: () => cached?.fcmEnabled ?? true,
    getPermissionStatus: () => cached?.permission ?? "default",
    getToken: () => cached?.token ?? null,
  };
}

/** Await the first status response — useful at app boot. */
export async function ensureNativePushReady(): Promise<NativeStatus | null> {
  const bus = getRawBus();
  if (!bus) return null;
  return ensureInitialised(bus);
}

/**
 * Trigger the native POST_NOTIFICATIONS dialog (Android 13+) and resolve
 * with the resulting permission state. On pre-Android 13 the native side
 * responds immediately with "granted". Resolves "denied" if no response
 * within `timeoutMs` (user dismissed by hardware-back, etc.).
 */
export function requestNativePushPermission(
  _facade: NativePushFacade,
  timeoutMs = 60_000,
): Promise<NativePushPermission> {
  return new Promise((resolve) => {
    const bus = getRawBus();
    if (!bus) {
      resolve("denied");
      return;
    }
    // Short-circuit when already granted.
    if (cached?.permission === "granted") {
      resolve("granted");
      return;
    }
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      const idx = pendingPermissionResolvers.indexOf(wrapped);
      if (idx >= 0) pendingPermissionResolvers.splice(idx, 1);
      resolve(cached?.permission ?? "denied");
    }, timeoutMs);
    const wrapped = (perm: NativePushPermission) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(perm);
    };
    pendingPermissionResolvers.push(wrapped);

    // Fire-and-forget the request. The actual permission outcome is
    // delivered later via the "permission" push event.
    sendAction(bus, "requestPermission").catch(() => {/* swallowed */});
  });
}

/**
 * Wait for the native FCM token. Returns immediately if cached; otherwise
 * issues a `refreshToken` action and waits up to `timeoutMs` for either
 * the response or the out-of-band "token" event.
 */
export async function getNativePushToken(
  _facade: NativePushFacade,
  timeoutMs = 15_000,
): Promise<string | null> {
  const bus = getRawBus();
  if (!bus) return null;
  if (cached?.token) return cached.token;

  const status = await Promise.race([
    sendAction(bus, "refreshToken", timeoutMs),
    new Promise<NativeStatus | null>((resolve) =>
      window.setTimeout(() => resolve(cached), timeoutMs),
    ),
  ]);
  return status?.token ?? cached?.token ?? null;
}

/**
 * High-level helper used by the nudge banner + push-registration hook:
 * obtains the native FCM token (waiting if necessary) and POSTs it to
 * `/api/push/register` with platform="android". Returns true when the
 * server accepted the registration.
 */
export async function registerNativePushToken(
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  apiUrl: string,
): Promise<boolean> {
  const facade = getNativePushBridge();
  if (!facade) return false;
  // Hydrate cache if needed so getPermissionStatus is meaningful.
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
