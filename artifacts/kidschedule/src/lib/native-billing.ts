/**
 * Bridge to Google Play Billing exposed by the kidschedule-android WebView
 * wrapper. The Android side installs `window.AmyNestBillingNative` via
 * `WebViewCompat.addWebMessageListener` (with a strict allowed-origin rule),
 * which surfaces a `postMessage(json)` + `onmessage` API.
 *
 * In a normal browser (no wrapper), `getNativeBilling()` returns null and
 * `isWrapperPresent()` returns false — callers fall back to Razorpay.
 *
 * In the wrapper, callers should treat `wrapperPresent && !available` as a
 * hard error (NOT a Razorpay fallback), since Google Play policy forbids
 * external payment for digital subscriptions.
 */

export type NativePackage = {
  identifier: string;
  packageType: string;
  productId: string;
  title: string;
  description: string;
  priceString: string;
  priceAmountMicros: number;
  currencyCode: string;
};

export type NativeOfferings = {
  currentOfferingId: string | null;
  packages: NativePackage[];
};

export type NativeCustomerInfo = {
  originalAppUserId: string;
  activeEntitlements: string[];
  isPremium: boolean;
};

export type NativePurchaseResult =
  | { ok: true; customerInfo: NativeCustomerInfo }
  | { ok: false; userCancelled?: boolean; error: string; code?: number };

/**
 * Object injected by Android `WebViewCompat.addWebMessageListener`.
 * Replies arrive on `onmessage` (not EventTarget.addEventListener) — see
 * https://developer.android.com/develop/ui/views/layout/webapps/native-api-access-jsbridge
 */
type WebMessageListenerObject = {
  postMessage: (data: string) => void;
  onmessage: ((event: { data: string }) => void) | null;
};

declare global {
  interface Window {
    AmyNestBillingNative?: WebMessageListenerObject;
  }
}

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
  timeoutMs = 60_000,
): Promise<T> {
  installListener(bridge);
  return new Promise<T>((resolve) => {
    const cbId = `cb_${Date.now().toString(36)}_${(cbCounter++).toString(36)}`;
    pending.set(cbId, { resolve: resolve as (v: unknown) => void });
    const timer = setTimeout(() => {
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

export type NativeBilling = {
  setUserId: (userId: string) => Promise<void>;
  getOfferings: () => Promise<{ ok: true; data: NativeOfferings } | { ok: false; error: string }>;
  purchase: (packageId: string) => Promise<NativePurchaseResult>;
  restore: () => Promise<{ ok: true; data: NativeCustomerInfo } | { ok: false; error: string }>;
  getCustomerInfo: () => Promise<{ ok: true; data: NativeCustomerInfo } | { ok: false; error: string }>;
};

/** True if the page is running inside the kidschedule-android wrapper. */
export function isWrapperPresent(): boolean {
  return typeof window !== "undefined" && !!window.AmyNestBillingNative;
}

/**
 * Probe the bridge for actual billing readiness. Returns null when not in
 * the wrapper at all. Returns false when the wrapper is present but
 * RevenueCat failed to initialise (e.g. missing API key) — in that case the
 * paywall MUST show an error rather than falling back to Razorpay.
 */
export async function probeBillingAvailability(): Promise<boolean | null> {
  const bridge = typeof window !== "undefined" ? window.AmyNestBillingNative : undefined;
  if (!bridge) return null;
  const result = await callAsync<{ ok: boolean; data?: { available: boolean } }>(
    bridge,
    { action: "isAvailable" },
    5_000,
  );
  return !!result?.data?.available;
}

/**
 * Returns the typed billing client when the wrapper is present. Note this
 * does NOT verify availability — call `probeBillingAvailability()` first
 * (the `useNativeBilling` hook does this for you).
 */
export function getNativeBilling(): NativeBilling | null {
  const bridge = typeof window !== "undefined" ? window.AmyNestBillingNative : undefined;
  if (!bridge) return null;
  return {
    setUserId: async (id) => {
      await callAsync(bridge, { action: "setUserId", userId: id }, 5_000);
    },
    getOfferings: () => callAsync(bridge, { action: "getOfferings" }),
    purchase: (pkg) => callAsync(bridge, { action: "purchase", packageId: pkg }),
    restore: () => callAsync(bridge, { action: "restore" }),
    getCustomerInfo: () => callAsync(bridge, { action: "getCustomerInfo" }),
  };
}
