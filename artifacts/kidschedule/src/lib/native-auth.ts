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
    __AMYNEST_PENDING_GOOGLE_ID_TOKEN?: string;
  }
}

type BridgeReply<T = unknown> =
  | { ok: true; cbId?: string; data: T }
  | { ok: false; cbId?: string; error: string };

type Pending = { resolve: (v: unknown) => void };

const pending = new Map<string, Pending>();
let cbCounter = 0;

function installListener(bridge: WebMessageListenerObject) {
  // Re-bind every call — WebView reloads recreate AmyNestAuthNative.
  bridge.onmessage = (event) => {
    let payload: BridgeReply;
    try {
      payload = JSON.parse(event.data) as BridgeReply;
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

function handleBridgePayload(payload: BridgeReply) {
  if (!payload.cbId) return;
  const p = pending.get(payload.cbId);
  if (!p) return;
  pending.delete(payload.cbId);
  p.resolve(payload);
}

if (typeof window !== "undefined") {
  window.addEventListener("amynest-google-auth-bridge-reply", (event) => {
    const detail = (event as CustomEvent<BridgeReply>).detail;
    if (detail) handleBridgePayload(detail);
  });
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
  return result.ok ? !!result.data?.available : false;
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
function pendingTokenSignInResult(): NativeGoogleSignInResult | null {
  const idToken = readPendingNativeGoogleIdToken();
  if (!idToken) return null;
  return { idToken, email: null, displayName: null, photoUrl: null };
}

const GOOGLE_SIGN_IN_BRIDGE_TIMEOUT_MS = 60_000;
const GOOGLE_PENDING_POLL_MS = 200;

/**
 * Polls for a native-injected ID token after the account picker closes.
 * Resolves only when a token appears (never rejects).
 */
function waitForInjectedGoogleIdToken(maxMs: number): Promise<NativeGoogleSignInResult> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: NativeGoogleSignInResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    const tryRecover = () => {
      const recovered = pendingTokenSignInResult();
      if (recovered) finish(recovered);
    };
    const onPending = () => tryRecover();
    const cleanup = () => {
      window.removeEventListener("amynest-google-auth-pending", onPending);
      clearInterval(interval);
    };
    window.addEventListener("amynest-google-auth-pending", onPending);
    tryRecover();
    const started = Date.now();
    const interval = window.setInterval(() => {
      tryRecover();
      if (!settled && Date.now() - started >= maxMs) cleanup();
    }, GOOGLE_PENDING_POLL_MS);
  });
}

function mapBridgeGoogleSignInError(reason: string): Error {
  if (reason === "user_cancelled") {
    return Object.assign(new Error("Google sign-in was cancelled."), {
      code: "auth/popup-closed-by-user",
    });
  }
  if (reason === "developer_error") {
    return Object.assign(
      new Error(
        "Google Sign-In is misconfigured for this app build (OAuth client / SHA-1). Update from Play Store or contact support.",
      ),
      { code: "app/developer_error" },
    );
  }
  if (reason === "bridge_timeout") {
    return Object.assign(
      new Error("Google sign-in timed out after choosing an account. Please try again."),
      { code: "app/google-sign-in-incomplete" },
    );
  }
  return Object.assign(new Error(reason), { code: `app/${reason}` });
}

/**
 * Waits for inject bridge reply OR native token injected after account picker
 * (Android delivers __AMYNEST_PENDING_GOOGLE_ID_TOKEN when WebMessage reply is lost).
 */
export async function signInWithGoogleViaNativeBridge(): Promise<NativeGoogleSignInResult> {
  const bridge = await waitForAuthBridge();
  if (!bridge) {
    throw Object.assign(new Error("Google sign-in bridge is not available."), {
      code: "app/auth-bridge-unavailable",
    });
  }

  const pendingRecovery = waitForInjectedGoogleIdToken(
    GOOGLE_SIGN_IN_BRIDGE_TIMEOUT_MS + 5_000,
  );

  const bridgeCall = callAsync<BridgeReply<NativeGoogleSignInResult>>(
    bridge,
    { action: "signInWithGoogle" },
    GOOGLE_SIGN_IN_BRIDGE_TIMEOUT_MS,
  ).then((result) => {
    if (!result.ok) {
      const recovered = pendingTokenSignInResult();
      if (recovered) return recovered;
      const reason = result.error || "google_sign_in_failed";
      throw mapBridgeGoogleSignInError(reason);
    }
    const idToken = result.data?.idToken?.trim();
    if (!idToken) {
      const recovered = pendingTokenSignInResult();
      if (recovered) return recovered;
      throw Object.assign(new Error("Google sign-in did not return an ID token."), {
        code: "app/google-no-id-token",
      });
    }
    return {
      idToken,
      email: result.data?.email ?? null,
      displayName: result.data?.displayName ?? null,
      photoUrl: result.data?.photoUrl ?? null,
    };
  });

  try {
    return await Promise.race([bridgeCall, pendingRecovery]);
  } catch (err) {
    const recovered = pendingTokenSignInResult();
    if (recovered) return recovered;
    throw err;
  }
}

export async function signOutGoogleViaNativeBridge(): Promise<void> {
  const bridge = await waitForAuthBridge(5_000);
  if (!bridge) return;
  await callAsync(bridge, { action: "signOutGoogle" }, 10_000);
}

export async function clearPendingNativeGoogleAuth(): Promise<void> {
  const bridge = await waitForAuthBridge(3_000);
  if (!bridge) return;
  await callAsync(bridge, { action: "clearPendingGoogleAuth" }, 5_000);
}

export function readPendingNativeGoogleIdToken(): string | null {
  const token = window.__AMYNEST_PENDING_GOOGLE_ID_TOKEN?.trim();
  if (!token) return null;
  delete window.__AMYNEST_PENDING_GOOGLE_ID_TOKEN;
  return token;
}
