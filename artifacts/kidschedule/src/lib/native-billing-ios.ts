/**
 * iOS Capacitor billing bridge via RevenueCat Purchases plugin.
 *
 * The @revenuecat/purchases-capacitor package is installed in the
 * amynest-capacitor shell and exposes window.Capacitor.Plugins.Purchases
 * at runtime — no npm install needed in kidschedule.
 *
 * iOS public API key: VITE_REVENUECAT_IOS_API_KEY env var (appl_xxx)
 * Set this in Replit Secrets before building the Capacitor project.
 *
 * Apple policy: ALL in-app purchases inside an iOS app MUST go through
 * Apple IAP. Razorpay and any other payment gateway are blocked.
 */

// ── RevenueCat Capacitor plugin type surface ──────────────────────────────

type RCPackageType =
  | "MONTHLY" | "ANNUAL" | "SIX_MONTH" | "THREE_MONTH"
  | "LIFETIME" | "CUSTOM" | "UNKNOWN";

export type RCPackage = {
  identifier: string;
  packageType: RCPackageType;
  offeringIdentifier: string;
  product: {
    identifier: string;
    priceString: string;
    price: number;
    currencyCode: string;
    title: string;
    description: string;
  };
};

type RCOffering = {
  identifier: string;
  serverDescription: string;
  availablePackages: RCPackage[];
  monthly: RCPackage | null;
  annual: RCPackage | null;
  sixMonth: RCPackage | null;
  threeMonth: RCPackage | null;
  lifetime: RCPackage | null;
};

type RCEntitlementInfo = {
  identifier: string;
  isActive: boolean;
  willRenew: boolean;
  productIdentifier: string;
  store: string;
};

export type RCCustomerInfo = {
  entitlements: {
    active: Record<string, RCEntitlementInfo>;
    all: Record<string, RCEntitlementInfo>;
  };
  activeSubscriptions: string[];
  allPurchasedProductIdentifiers: string[];
  originalAppUserId: string;
};

type CapPurchasesPlugin = {
  configure(opts: { apiKey: string; appUserID?: string }): Promise<void>;
  logIn(opts: { appUserID: string }): Promise<{ customerInfo: RCCustomerInfo; created: boolean }>;
  logOut(): Promise<{ customerInfo: RCCustomerInfo }>;
  getOfferings(): Promise<{ current: RCOffering | null; all: Record<string, RCOffering> }>;
  getCustomerInfo(): Promise<{ customerInfo: RCCustomerInfo }>;
  purchasePackage(opts: { aPackage: RCPackage }): Promise<{
    customerInfo: RCCustomerInfo;
    transaction: unknown;
  }>;
  restorePurchases(): Promise<{ customerInfo: RCCustomerInfo }>;
};

// ── Helpers ───────────────────────────────────────────────────────────────

// window.Capacitor is fully declared in native-push-bridge.ts (including
// the Purchases plugin slot). No duplicate declaration needed here.
// isCapacitorIOS is also re-exported from native-push-bridge.ts.
export { isCapacitorIOS } from "@/lib/native-push-bridge";

function getPurchasesPlugin(): CapPurchasesPlugin | null {
  if (typeof window === "undefined") return null;
  // Cast via unknown because the shared Capacitor type uses `unknown` for
  // the Purchases plugin body — the runtime shape matches CapPurchasesPlugin.
  return (window.Capacitor?.Plugins?.Purchases as CapPurchasesPlugin | undefined) ?? null;
}

// ── Module-level state ────────────────────────────────────────────────────

let configuredForUser: string | null = null;
let cachedOffering: RCOffering | null = null;

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Configure RevenueCat and log in the current user.
 * Safe to call multiple times — re-runs only when userId changes.
 */
export async function initIOSBilling(userId: string): Promise<boolean> {
  const plugin = getPurchasesPlugin();
  if (!plugin) return false;

  const apiKey = (import.meta.env.VITE_REVENUECAT_IOS_API_KEY as string | undefined) ?? "";
  if (!apiKey) {
    console.warn("[IOSBilling] VITE_REVENUECAT_IOS_API_KEY is not set.");
    return false;
  }

  try {
    if (configuredForUser !== userId) {
      await plugin.configure({ apiKey });
      await plugin.logIn({ appUserID: userId });
      configuredForUser = userId;
      cachedOffering = null;
    }
    return true;
  } catch (e) {
    console.warn("[IOSBilling] init failed:", e);
    return false;
  }
}

/**
 * Fetch the current RevenueCat offering.
 * Returns null when unavailable or not configured.
 */
export async function getIOSOffering(): Promise<RCOffering | null> {
  if (cachedOffering) return cachedOffering;
  const plugin = getPurchasesPlugin();
  if (!plugin) return null;
  try {
    const { current } = await plugin.getOfferings();
    cachedOffering = current;
    return current;
  } catch {
    return null;
  }
}

/**
 * Find a package in the current offering by plan id.
 *   "monthly"   → MONTHLY package
 *   "six_month" → SIX_MONTH package
 *   "annual"    → ANNUAL package
 */
export async function getIOSPackageForPlan(
  plan: "monthly" | "six_month" | "yearly",
): Promise<RCPackage | null> {
  const offering = await getIOSOffering();
  if (!offering) return null;

  const typeMap: Record<typeof plan, RCPackageType> = {
    monthly:   "MONTHLY",
    six_month: "SIX_MONTH",
    yearly:    "ANNUAL",
  };
  const target = typeMap[plan];
  return (
    offering.availablePackages.find((p) => p.packageType === target) ?? null
  );
}

/**
 * Purchase a package. Returns ok:true on success, ok:false with reason on failure.
 * userCancelled:true when the user tapped "Cancel" on the Apple payment sheet.
 */
export async function purchaseIOSPackage(
  pkg: RCPackage,
): Promise<{ ok: boolean; userCancelled?: boolean; reason?: string; customerInfo?: RCCustomerInfo }> {
  const plugin = getPurchasesPlugin();
  if (!plugin) return { ok: false, reason: "RevenueCat plugin not available." };
  try {
    const { customerInfo } = await plugin.purchasePackage({ aPackage: pkg });
    const entitlements = customerInfo.entitlements.active;
    const isPremium =
      Object.values(entitlements).some((e) => e.isActive) ||
      customerInfo.activeSubscriptions.length > 0;
    if (!isPremium) {
      return { ok: false, reason: "Purchase succeeded but entitlement not active. Please restore purchases." };
    }
    return { ok: true, customerInfo };
  } catch (err: unknown) {
    // RevenueCat error code 1 = purchase cancelled by user
    const e = err as { code?: number; message?: string; userCancelled?: boolean };
    if (e?.code === 1 || e?.userCancelled === true) {
      return { ok: false, userCancelled: true };
    }
    return {
      ok: false,
      reason: e?.message ?? "Apple purchase failed. Please try again.",
    };
  }
}

/**
 * Restore previous Apple purchases.
 * Returns true if any active entitlement is found after restore.
 */
export async function restoreIOSPurchases(): Promise<{
  ok: boolean;
  isPremium: boolean;
  customerInfo?: RCCustomerInfo;
}> {
  const plugin = getPurchasesPlugin();
  if (!plugin) return { ok: false, isPremium: false };
  try {
    const { customerInfo } = await plugin.restorePurchases();
    const isPremium =
      Object.values(customerInfo.entitlements.active).some((e) => e.isActive) ||
      customerInfo.activeSubscriptions.length > 0;
    return { ok: true, isPremium, customerInfo };
  } catch {
    return { ok: false, isPremium: false };
  }
}

/**
 * Check if the user currently has an active subscription via iOS IAP.
 */
export async function getIOSCustomerInfo(): Promise<RCCustomerInfo | null> {
  const plugin = getPurchasesPlugin();
  if (!plugin) return null;
  try {
    const { customerInfo } = await plugin.getCustomerInfo();
    return customerInfo;
  } catch {
    return null;
  }
}
