// RevenueCat client wrapper for AmyNest mobile.
// Configures Purchases SDK once at startup, exposes a typed purchase()
// helper that maps our internal Plan codes -> RC packages, and surfaces
// the active entitlement.
import { Platform } from "react-native";
import Purchases, { type CustomerInfo, type PurchasesPackage } from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import Constants from "expo-constants";

const TEST_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const RC_ENTITLEMENT_ID = "premium";
export const RC_OFFERING_ID = "default";

// Map our internal Plan codes to RC package identifiers (set during seed).
export const PLAN_TO_PACKAGE_ID: Record<"monthly" | "six_month" | "yearly", string> = {
  monthly: "$rc_monthly",
  six_month: "$rc_six_month",
  yearly: "$rc_annual",
};

let initialized = false;
let configuredUserId: string | null = null;
let identifyInFlight: Promise<void> | null = null;

function pickApiKey(): string | null {
  // In Expo Go, dev builds, web, or running inside Storefront simulator,
  // RC runs in Preview API mode and the test key is appropriate.
  if (__DEV__ || Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
    return TEST_KEY ?? null;
  }
  if (Platform.OS === "ios") return IOS_KEY ?? null;
  if (Platform.OS === "android") return ANDROID_KEY ?? null;
  return TEST_KEY ?? null;
}

export function initializeRevenueCat(): void {
  if (initialized) return;
  const apiKey = pickApiKey();
  if (!apiKey) {
    console.warn("[RevenueCat] No API key configured for this platform");
    return;
  }
  Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
  Purchases.configure({ apiKey });
  initialized = true;
}

/** Identify the current user with RevenueCat. Safe to call repeatedly. */
export async function identifyUser(userId: string): Promise<void> {
  if (!initialized) initializeRevenueCat();
  if (!initialized) return;
  if (configuredUserId === userId) return;
  if (identifyInFlight) return identifyInFlight;
  identifyInFlight = (async () => {
    try {
      await Purchases.logIn(userId);
      configuredUserId = userId;
    } catch (e) {
      console.warn("[RevenueCat] logIn failed", e);
    } finally {
      identifyInFlight = null;
    }
  })();
  return identifyInFlight;
}

/** Resolves once the most recent identifyUser() call settles. */
async function ensureIdentified(): Promise<void> {
  if (identifyInFlight) await identifyInFlight;
}

export async function logoutRevenueCat(): Promise<void> {
  if (!initialized) return;
  try {
    await Purchases.logOut();
    configuredUserId = null;
  } catch {
    // ignore (anonymous user)
  }
}

export async function getCurrentOffering(): Promise<PurchasesPackage[]> {
  if (!initialized) initializeRevenueCat();
  if (!initialized) return [];
  const offerings = await Purchases.getOfferings();
  const current = offerings.current ?? offerings.all[RC_OFFERING_ID];
  return current?.availablePackages ?? [];
}

export type PurchaseResult =
  | { ok: true; isPremium: boolean; customerInfo: CustomerInfo }
  | { ok: false; userCancelled: boolean; reason: string };

/** Trigger a purchase for our internal plan code. Maps to RC package identifier. */
export async function purchasePlan(
  plan: "monthly" | "six_month" | "yearly",
): Promise<PurchaseResult> {
  if (!initialized) initializeRevenueCat();
  if (!initialized) {
    return { ok: false, userCancelled: false, reason: "RevenueCat not initialised" };
  }

  const pkgId = PLAN_TO_PACKAGE_ID[plan];
  const packages = await getCurrentOffering();
  const pkg = packages.find((p) => p.identifier === pkgId);
  if (!pkg) {
    return { ok: false, userCancelled: false, reason: `Package ${pkgId} not found in offering` };
  }

  // Make sure the user is identified with RC before charging — otherwise the
  // purchase is attached to an anonymous app_user_id and the webhook can't be
  // matched to our backend user.
  await ensureIdentified();

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium = customerInfo.entitlements.active[RC_ENTITLEMENT_ID] !== undefined;
    return { ok: true, isPremium, customerInfo };
  } catch (e: any) {
    const userCancelled = !!e?.userCancelled;
    return {
      ok: false,
      userCancelled,
      reason: userCancelled ? "Purchase cancelled" : (e?.message ?? "Purchase failed"),
    };
  }
}

export async function restorePurchases(): Promise<{ isPremium: boolean }> {
  if (!initialized) initializeRevenueCat();
  if (!initialized) return { isPremium: false };
  const customerInfo = await Purchases.restorePurchases();
  return { isPremium: customerInfo.entitlements.active[RC_ENTITLEMENT_ID] !== undefined };
}

export type RCPaywallResult =
  | { purchased: true; restored: false; cancelled: false }
  | { purchased: false; restored: true; cancelled: false }
  | { purchased: false; restored: false; cancelled: true }
  | { purchased: false; restored: false; cancelled: false; error: true };

/**
 * Show the RevenueCat-published Paywall Editor paywall natively.
 * Uses `RevenueCatUI.presentPaywall()` — the paywall design and package
 * configuration come from the RevenueCat dashboard, not from our custom UI.
 *
 * Call this on iOS (where we don't need the Razorpay UCB alternative).
 * Android keeps the custom paywall so the Google Play UCB Razorpay option
 * can be shown as required by Play store policy.
 */
export async function presentRCPaywall(): Promise<RCPaywallResult> {
  if (!initialized) initializeRevenueCat();
  try {
    await ensureIdentified();
    const result = await RevenueCatUI.presentPaywall();
    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
        return { purchased: true, restored: false, cancelled: false };
      case PAYWALL_RESULT.RESTORED:
        return { purchased: false, restored: true, cancelled: false };
      case PAYWALL_RESULT.CANCELLED:
      case PAYWALL_RESULT.NOT_PRESENTED:
        return { purchased: false, restored: false, cancelled: true };
      default:
        return { purchased: false, restored: false, cancelled: false, error: true };
    }
  } catch (e) {
    console.warn("[RevenueCat] presentPaywall error", e);
    return { purchased: false, restored: false, cancelled: false, error: true };
  }
}

/**
 * Show the RC Paywall only if the user does not already have the
 * `premium` entitlement active. Useful for feature-gate entry points.
 */
export async function presentRCPaywallIfNeeded(): Promise<RCPaywallResult> {
  if (!initialized) initializeRevenueCat();
  try {
    await ensureIdentified();
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: RC_ENTITLEMENT_ID,
    });
    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
        return { purchased: true, restored: false, cancelled: false };
      case PAYWALL_RESULT.RESTORED:
        return { purchased: false, restored: true, cancelled: false };
      case PAYWALL_RESULT.NOT_PRESENTED:
      case PAYWALL_RESULT.CANCELLED:
        return { purchased: false, restored: false, cancelled: true };
      default:
        return { purchased: false, restored: false, cancelled: false, error: true };
    }
  } catch (e) {
    console.warn("[RevenueCat] presentPaywallIfNeeded error", e);
    return { purchased: false, restored: false, cancelled: false, error: true };
  }
}
