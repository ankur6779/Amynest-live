/**
 * Google Sign-In bridge for the kidschedule-android WebView wrapper.
 * Native side exposes `window.AmyNestAuthNative` (see AuthBridge.kt).
 */

type WebMessageListenerObject = {
  postMessage: (data: string) => void;
  onmessage: ((event: { data: string }) => void) | null;
};

declare global {
  interface Window {
    AmyNestAuthNative?: WebMessageListenerObject;
    __AMYNEST_AUTH?: string;
  }
}

type BridgeReply<T = unknown> =
  | { ok: true; cbId?: string; data: T }
  | { ok: false; cbId?: string; error: string };

type Pending = { resolve: (v: unknown) => void };

const pending = new Map<string, Pending>();
let cbCounter = 0;
let listenerInstalled = false;

function installListener(bridge: WebMessageListenerObject) {
  if (listenerInstalled) return;
  listenerInstalled = true;
  bridge.onmessage = (event) => {
    let payload: { cbId?: string };
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!payload.cbId) return;
    const p = pending.get(payload.cbId);
    if (!p) return;
    pending.delete(payload.cbId);
    p.resolve(payload);
  };
}

function callAsync<T>(
  bridge: WebMessageListenerObject,
  message: Record<string, unknown>,
  timeoutMs = 120_000,
): Promise<T> {
  installListener(bridge);
  return new Promise<T>((resolve) => {
    const cbId = `cb_${Date.now().toString(36)}_${(cbCounter++).toString(36)}`;
    const timer = window.setTimeout(() => {
      if (pending.delete(cbId)) {
        resolve({ ok: false, error: "bridge_timeout" } as unknown as T);
      }
    }, timeoutMs);
    const wrappedResolve = (v: unknown) => {
      clearTimeout(timer);
      resolve(v as T);
    };
    pending.set(cbId, { resolve: wrappedResolve });
    try {
      bridge.postMessage(JSON.stringify({ ...message, cbId }));
    } catch (err) {
      pending.delete(cbId);
      clearTimeout(timer);
      resolve({
        ok: false,
        error: err instanceof Error ? err.message : "bridge_call_failed",
      } as unknown as T);
    }
  });
}

/** True when running inside the AmyNest Android WebView wrapper (not Capacitor). */
export function isAndroidAuthBridgePresent(): boolean {
  if (typeof window === "undefined") return false;
  if (window.AmyNestAuthNative) return true;
  if (typeof window.__AMYNEST_AUTH === "string") return true;
  return (
    typeof navigator !== "undefined" &&
    /AmyNestAndroid/.test(navigator.userAgent) &&
    !(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.()
  );
}

export async function waitForAuthBridge(
  timeoutMs = 15_000,
): Promise<WebMessageListenerObject | null> {
  if (typeof window === "undefined") return null;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const bridge = window.AmyNestAuthNative;
    if (bridge && typeof bridge.postMessage === "function") return bridge;
    await new Promise((r) => window.setTimeout(r, 200));
  }
  return window.AmyNestAuthNative ?? null;
}

export async function probeAuthBridgeAvailability(): Promise<boolean | null> {
  if (!isAndroidAuthBridgePresent()) return null;
  const bridge = await waitForAuthBridge();
  if (!bridge) return false;
  const result = await callAsync<BridgeReply<{ available: boolean }>>(
    bridge,
    { action: "isAvailable" },
    8_000,
  );
  return !!result?.data?.available;
}

export type NativeGoogleSignInResult = {
  idToken: string;
  email?: string | null;
  displayName?: string | null;
  photoUrl?: string | null;
};

/**
 * Opens the native Google account picker and returns an ID token for Firebase.
 * Throws with `.code` set for user cancel / developer misconfiguration.
 */
export async function signInWithGoogleViaNativeBridge(): Promise<NativeGoogleSignInResult> {
  const bridge = await waitForAuthBridge();
  if (!bridge) {
    throw Object.assign(new Error("Google sign-in bridge is not available."), {
      code: "app/auth-bridge-unavailable",
    });
  }

  const result = await callAsync<BridgeReply<NativeGoogleSignInResult>>(
    bridge,
    { action: "signInWithGoogle" },
  );

  if (!result.ok) {
    const reason = result.error || "google_sign_in_failed";
    if (reason === "user_cancelled") {
      throw Object.assign(new Error("Google sign-in was cancelled."), {
        code: "auth/popup-closed-by-user",
      });
    }
    throw Object.assign(new Error(reason), { code: `app/${reason}` });
  }

  const idToken = result.data?.idToken?.trim();
  if (!idToken) {
    throw Object.assign(new Error("Google sign-in did not return an ID token."), {
      code: "app/google-no-id-token",
    });
  }

  return {
    idToken,
    email: result.data.email ?? null,
    displayName: result.data.displayName ?? null,
    photoUrl: result.data.photoUrl ?? null,
  };
}

export async function signOutGoogleViaNativeBridge(): Promise<void> {
  const bridge = await waitForAuthBridge(5_000);
  if (!bridge) return;
  await callAsync(bridge, { action: "signOutGoogle" }, 10_000);
}
