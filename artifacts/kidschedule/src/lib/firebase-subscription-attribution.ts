/**
 * Firebase Analytics subscription events for Google Ads conversion tracking.
 * Android Play WebView → native Firebase SDK (reliable app attribution).
 * Web / fallback → Firebase JS SDK.
 */

import { getApps } from "firebase/app";
import { getAnalytics, isSupported, logEvent, setUserId, type Analytics } from "firebase/analytics";
import type { Plan } from "@/hooks/use-subscription";
import { isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";
import { getFirebaseAuth, initializeFirebase } from "@/lib/firebase";
import { resolveMetaPlanPrice } from "@/lib/meta-attribution";
import { getNativeBilling, waitForBillingBridge } from "@/lib/native-billing";

export const FIREBASE_SUBSCRIPTION_CONVERT_EVENT = "app_store_subscription_convert";
export const FIREBASE_BEGIN_CHECKOUT_EVENT = "begin_checkout";
export const FIREBASE_SIGN_UP_EVENT = "sign_up";

type AnalyticsEventParams = Record<
  string,
  string | number | Array<Record<string, string | number>>
>;

type FirebaseSubscriptionOpts = {
  source?: string;
  value?: number;
  currency?: string;
  productId?: string;
  transactionId?: string;
};

let analyticsInstance: Analytics | null | undefined;

function logAnalyticsEvent(
  analytics: Analytics,
  name: string,
  params: AnalyticsEventParams,
): void {
  logEvent(analytics, name as Parameters<typeof logEvent>[1], params);
}

/** True only inside the Play Store WebView wrapper (has AmyNestBillingNative). */
function shouldUseNativeAndroidFirebase(): boolean {
  return isNativeAmyNestAndroidWrapper();
}

function buildEcommerceParams(
  itemId: string,
  currency: string,
  value: number,
  source?: string,
  transactionId?: string,
): AnalyticsEventParams {
  return {
    currency,
    value,
    item_id: itemId,
    item_name: itemId,
    items: [
      {
        item_id: itemId,
        item_name: itemId,
        item_category: "subscription",
        price: value,
        quantity: 1,
      },
    ],
    ...(source ? { source } : {}),
    ...(transactionId ? { transaction_id: transactionId } : {}),
  };
}

function currentAuthUserId(): string | null {
  try {
    return getFirebaseAuth().currentUser?.uid ?? null;
  } catch {
    return null;
  }
}

async function logNativeAndroidSubscriptionEvent(
  event: "purchase" | "begin_checkout" | "sign_up",
  productId: string,
  currency: string,
  value: number,
  source?: string,
  transactionId?: string,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  await waitForBillingBridge(4_000);
  const billing = getNativeBilling();
  if (!billing?.logSubscriptionAnalytics) return false;
  try {
    const result = await billing.logSubscriptionAnalytics({
      event,
      productId,
      currency,
      value,
      source,
      userId: currentAuthUserId() ?? undefined,
      transactionId,
    });
    return result.ok === true;
  } catch {
    return false;
  }
}

/**
 * Bind Firebase Analytics (Google Ads) to the signed-in AmyNest user.
 * Pass `null` on sign-out so the next account is not attributed to this ID.
 */
export async function setFirebaseAnalyticsUserId(userId: string | null): Promise<void> {
  if (shouldUseNativeAndroidFirebase()) {
    await waitForBillingBridge(2_000);
    const billing = getNativeBilling();
    if (billing?.setAnalyticsUserId) {
      try {
        await billing.setAnalyticsUserId(userId);
      } catch {
        /* native FA identity is best-effort */
      }
    }
  }

  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;
  try {
    setUserId(analytics, userId);
  } catch {
    /* ignore */
  }
}

async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (analyticsInstance !== undefined) return analyticsInstance;
  if (typeof window === "undefined") {
    analyticsInstance = null;
    return null;
  }

  const init = initializeFirebase();
  if (init.status !== "ok") {
    analyticsInstance = null;
    return null;
  }

  try {
    if (!(await isSupported())) {
      analyticsInstance = null;
      return null;
    }
    const app = getApps()[0];
    if (!app) {
      analyticsInstance = null;
      return null;
    }
    analyticsInstance = getAnalytics(app);
    return analyticsInstance;
  } catch {
    analyticsInstance = null;
    return null;
  }
}

function resolvePlanValue(
  plan: Plan | string | undefined,
  opts?: FirebaseSubscriptionOpts,
): { value: number; currency: string; itemId: string } {
  const itemId =
    opts?.productId?.trim() ||
    (typeof plan === "string" ? plan : plan ?? "subscription");
  if (opts?.value != null && opts.currency) {
    return { value: opts.value, currency: opts.currency, itemId };
  }
  const resolved = resolveMetaPlanPrice(plan);
  return {
    value: opts?.value ?? resolved.value,
    currency: opts?.currency ?? resolved.currency,
    itemId,
  };
}

async function logWebFirebaseEvents(
  events: Array<{ name: string; params: AnalyticsEventParams }>,
): Promise<boolean> {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return false;
  try {
    for (const event of events) {
      logAnalyticsEvent(analytics, event.name, event.params);
    }
    return true;
  } catch {
    return false;
  }
}

/** Log subscription purchase for Google Ads (WebView + web fallback). */
export async function trackFirebaseSubscriptionPurchase(
  plan: Plan | string | undefined,
  opts?: FirebaseSubscriptionOpts,
): Promise<void> {
  const uid = currentAuthUserId();
  if (uid) await setFirebaseAnalyticsUserId(uid);

  const { value, currency, itemId } = resolvePlanValue(plan, opts);
  const params = buildEcommerceParams(
    itemId,
    currency,
    value,
    opts?.source,
    opts?.transactionId,
  );

  if (shouldUseNativeAndroidFirebase()) {
    const nativeOk = await logNativeAndroidSubscriptionEvent(
      "purchase",
      itemId,
      currency,
      value,
      opts?.source,
      opts?.transactionId,
    );
    if (nativeOk) return;
  }

  await logWebFirebaseEvents([
    { name: "purchase", params },
    { name: FIREBASE_SUBSCRIPTION_CONVERT_EVENT, params },
  ]);
}

/** Log checkout start — maps to begin_checkout in Google Ads. */
export async function trackFirebaseBeginCheckout(
  plan: Plan | string | undefined,
  opts?: FirebaseSubscriptionOpts,
): Promise<void> {
  const { value, currency, itemId } = resolvePlanValue(plan, opts);
  const params = buildEcommerceParams(
    itemId,
    currency,
    value,
    opts?.source,
    opts?.transactionId,
  );

  if (shouldUseNativeAndroidFirebase()) {
    const nativeOk = await logNativeAndroidSubscriptionEvent(
      "begin_checkout",
      itemId,
      currency,
      value,
      opts?.source,
      opts?.transactionId,
    );
    if (nativeOk) return;
  }

  await logWebFirebaseEvents([{ name: FIREBASE_BEGIN_CHECKOUT_EVENT, params }]);
}

/** Billing bridge versions that understand quality events (skip unknown→convert). */
function nativeBridgeSupportsQualityEvents(): boolean {
  return nativeBridgeAtLeast(2, 7, 0);
}

/** Billing bridge versions that understand `sign_up` (avoid 1.4.55 else→subscription_convert). */
function nativeBridgeSupportsSignUp(): boolean {
  return nativeBridgeAtLeast(2, 5, 2);
}

function nativeBridgeAtLeast(maj: number, min: number, patch: number): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.__AMYNEST_BILLING;
  if (typeof raw !== "string" || !raw.trim()) return false;
  const parts = raw.split(".").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return false;
  const [foundMaj = 0, foundMin = 0, foundPatch = 0] = parts;
  if (foundMaj !== maj) return foundMaj > maj;
  if (foundMin !== min) return foundMin > min;
  return foundPatch >= patch;
}

/** Log signup — Firebase `sign_up` for Google Ads app conversion optimization. */
export async function trackFirebaseSignUp(opts?: {
  method?: string;
  source?: string;
}): Promise<void> {
  const method = opts?.method ?? "app";
  const params: AnalyticsEventParams = {
    method,
    ...(opts?.source ? { source: opts.source } : {}),
  };

  if (shouldUseNativeAndroidFirebase() && nativeBridgeSupportsSignUp()) {
    const nativeOk = await logNativeAndroidSubscriptionEvent(
      "sign_up",
      method,
      "INR",
      0,
      opts?.source,
    );
    if (nativeOk) return;
  }

  await logWebFirebaseEvents([{ name: FIREBASE_SIGN_UP_EVENT, params }]);
}

export const FIREBASE_QUALITY_EVENT_NAMES = {
  onboarding_completed: "onboarding_completed",
  first_plan_generated: "first_plan_generated",
  trial_started: "start_trial",
  speech_coach_started: "speech_coach_started",
} as const;

export type FirebaseQualitySignal = keyof typeof FIREBASE_QUALITY_EVENT_NAMES;

const qualityOnce = new Set<string>();

const BLOCKED_QUALITY_PARAM_KEYS = new Set([
  "email",
  "phone",
  "name",
  "child_name",
  "user_name",
  "address",
]);

function cleanQualityParams(
  params?: Record<string, string | number | boolean | undefined | null>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (!params) return out;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (BLOCKED_QUALITY_PARAM_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === "boolean") {
      out[key] = value ? "true" : "false";
    } else if (typeof value === "number" && Number.isFinite(value)) {
      out[key] = value;
    } else if (typeof value === "string" && value.trim()) {
      out[key] = value.slice(0, 100);
    }
  }
  return out;
}

async function logNativeQualityEvent(
  event: string,
  params: Record<string, string | number>,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  await waitForBillingBridge(4_000);
  const billing = getNativeBilling();
  if (!billing?.logQualityAnalytics) return false;
  try {
    const stringParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      stringParams[key] = String(value);
    }
    const result = await billing.logQualityAnalytics({
      event,
      params: stringParams,
      userId: currentAuthUserId() ?? undefined,
    });
    return result.ok === true;
  } catch {
    return false;
  }
}

/**
 * Forward an existing AmyNest milestone to Firebase for future Ads import.
 * Does not rename product analytics events. Dedupes per onceKey.
 */
export async function trackFirebaseQualitySignal(
  signal: FirebaseQualitySignal,
  params?: Record<string, string | number | boolean | undefined | null>,
  opts?: { onceKey?: string },
): Promise<void> {
  const onceKey = opts?.onceKey ?? signal;
  if (qualityOnce.has(onceKey)) return;
  qualityOnce.add(onceKey);

  const name = FIREBASE_QUALITY_EVENT_NAMES[signal];
  const cleaned = cleanQualityParams(params);

  if (shouldUseNativeAndroidFirebase() && nativeBridgeSupportsQualityEvents()) {
    const nativeOk = await logNativeQualityEvent(name, cleaned);
    if (nativeOk) return;
  }

  await logWebFirebaseEvents([{ name, params: cleaned }]);
}

/** Reset cached analytics instance (tests). */
export function resetFirebaseSubscriptionAnalyticsForTests(): void {
  analyticsInstance = undefined;
  qualityOnce.clear();
}
