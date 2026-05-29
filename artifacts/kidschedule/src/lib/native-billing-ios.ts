/**
 * iOS Capacitor billing bridge via RevenueCat Purchases plugin.
 *
 * The @revenuecat/purchases-capacitor package is installed in the
 * amynest-capacitor shell and exposes window.Capacitor.Plugins.Purchases
 * at runtime — no npm install needed in kidschedule.
 *
 * iOS public API key: VITE_REVENUECAT_IOS_API_KEY — use the production `appl_…`
 * key from RevenueCat (App Store app). Not the RevenueCat `test_…` test-store key.
 * Baked in at `artifacts/amynest-capacitor` build time via build-web.mjs.
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
  isConfigured?(): Promise<{ isConfigured: boolean }>;
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

export type IOSBillingInitCode =
  | "no_plugin"
  | "no_api_key"
  | "configure_failed"
  | "no_offerings";

export type IOSBillingInitResult =
  | { ok: true }
  | { ok: false; code: IOSBillingInitCode; reason: string };

// ── Helpers ───────────────────────────────────────────────────────────────

export { isCapacitorIOS } from "@/lib/native-push-bridge";

function getPurchasesPlugin(): CapPurchasesPlugin | null {
  if (typeof window === "undefined") return null;
  return (window.Capacitor?.Plugins?.Purchases as CapPurchasesPlugin | undefined) ?? null;
}

async function waitForPurchasesPlugin(maxMs = 10_000): Promise<CapPurchasesPlugin | null> {
  const existing = getPurchasesPlugin();
  if (existing) return existing;
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    await new Promise((r) => setTimeout(r, 200));
    const plugin = getPurchasesPlugin();
    if (plugin) return plugin;
  }
  return null;
}

function readIosRevenueCatApiKey(): string {
  return (import.meta.env.VITE_REVENUECAT_IOS_API_KEY as string | undefined)?.trim() ?? "";
}

// ── Module-level state ────────────────────────────────────────────────────

let configuredForUser: string | null = null;
let cachedOffering: RCOffering | null = null;
let lastInitFailure: IOSBillingInitResult & { ok: false } | null = null;

export function getLastIOSBillingInitFailure(): (IOSBillingInitResult & { ok: false }) | null {
  return lastInitFailure;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Configure RevenueCat, log in, and verify the current offering has packages.
 */
export async function initIOSBilling(userId: string): Promise<IOSBillingInitResult> {
  lastInitFailure = null;

  const plugin = await waitForPurchasesPlugin();
  if (!plugin) {
    lastInitFailure = {
      ok: false,
      code: "no_plugin",
      reason:
        "In-app purchase module did not load. Rebuild the iOS app from the latest amynest-capacitor project and try again.",
    };
    console.warn("[IOSBilling]", lastInitFailure.reason);
    return lastInitFailure;
  }

  const apiKey = readIosRevenueCatApiKey();
  if (!apiKey) {
    lastInitFailure = {
      ok: false,
      code: "no_api_key",
      reason:
        "RevenueCat iOS key missing from this build. Rebuild with your production appl_ key in VITE_REVENUECAT_IOS_API_KEY, then reinstall the app.",
    };
    console.warn("[IOSBilling]", lastInitFailure.reason);
    return lastInitFailure;
  }
  if (apiKey.startsWith("test_")) {
    lastInitFailure = {
      ok: false,
      code: "no_api_key",
      reason:
        "This build has a RevenueCat test-store key (test_…). Use your production App Store key (appl_…) from the RevenueCat dashboard instead.",
    };
    console.warn("[IOSBilling]", lastInitFailure.reason);
    return lastInitFailure;
  }
  if (!apiKey.startsWith("appl_")) {
    lastInitFailure = {
      ok: false,
      code: "no_api_key",
      reason:
        "Invalid RevenueCat iOS key format. Use the production App Store public key (starts with appl_).",
    };
    console.warn("[IOSBilling]", lastInitFailure.reason);
    return lastInitFailure;
  }

  try {
    if (configuredForUser !== userId) {
      await plugin.configure({ apiKey, appUserID: userId });
      try {
        await plugin.logIn({ appUserID: userId });
      } catch {
        /* configure may already bind this user */
      }
      configuredForUser = userId;
      cachedOffering = null;
    }

    const configured =
      typeof plugin.isConfigured === "function"
        ? (await plugin.isConfigured()).isConfigured
        : true;
    if (!configured) {
      throw new Error("RevenueCat isConfigured=false after configure()");
    }

    const { current } = await plugin.getOfferings();
    cachedOffering = current;
    const hasPackages =
      !!current &&
      (current.availablePackages?.length > 0 ||
        !!current.monthly ||
        !!current.sixMonth ||
        !!current.annual);

    if (!hasPackages) {
      console.warn(
        "[IOSBilling] RevenueCat configured but no App Store packages in current offering yet.",
        { offeringId: current?.identifier ?? null },
      );
    }

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    lastInitFailure = {
      ok: false,
      code: "configure_failed",
      reason: `App Store subscription setup failed: ${message}. Make sure you are signed in to the App Store on this device and subscription products are live in App Store Connect.`,
    };
    console.warn("[IOSBilling] init failed:", e);
    configuredForUser = null;
    cachedOffering = null;
    return lastInitFailure;
  }
}

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

export async function getIOSPackageForPlan(
  plan: "monthly" | "six_month" | "yearly",
): Promise<RCPackage | null> {
  const offering = await getIOSOffering();
  if (!offering) return null;

  const typeMap: Record<typeof plan, RCPackageType> = {
    monthly: "MONTHLY",
    six_month: "SIX_MONTH",
    yearly: "ANNUAL",
  };
  const target = typeMap[plan];
  const fromList = offering.availablePackages.find((p) => p.packageType === target);
  if (fromList) return fromList;
  if (target === "MONTHLY" && offering.monthly) return offering.monthly;
  if (target === "SIX_MONTH" && offering.sixMonth) return offering.sixMonth;
  if (target === "ANNUAL" && offering.annual) return offering.annual;
  return null;
}

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
      return {
        ok: false,
        reason: "Purchase succeeded but entitlement not active. Please restore purchases.",
      };
    }
    return { ok: true, customerInfo };
  } catch (err: unknown) {
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
