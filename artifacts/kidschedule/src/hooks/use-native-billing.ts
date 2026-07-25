import { parseApiJson } from "@/lib/safe-json-response";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@/lib/firebase-auth-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import {
  getNativeBilling,
  isWrapperPresent,
  probeBillingAvailability,
  waitForBillingBridge,
  type NativeBilling,
  type NativePurchaseResult,
} from "@/lib/native-billing";
import {
  isCapacitorIOS,
  initIOSBilling,
  getIOSPackageForPlan,
  purchaseIOSPackage,
  restoreIOSPurchases,
} from "@/lib/native-billing-ios";
import type { Plan } from "@/hooks/use-subscription";
import type { StorePlanPrice } from "@/lib/plan-price";
import { finalizeNativePurchase, finalizeNativeRestore } from "@/lib/native-purchase-finalize";
import { getGuestCheckoutBlock } from "@/lib/anonymous-auth";

type RcConfig = {
  provider: "revenuecat";
  entitlementId: string;
  offeringId: string;
  appUserId: string;
  packageMap: Record<Exclude<Plan, "free">, string>;
};

export function isCanonicalBillingReady(input: {
  nativeAvailable: boolean;
  wrapperPresent: boolean;
  currentUserId: string | null;
  billingConfigUserId: string | null;
  revenueCatAppUserId: string | null;
  billingConfigLoading: boolean;
}): boolean {
  if (!input.nativeAvailable) return false;
  if (!input.wrapperPresent) return true;
  return Boolean(
    input.currentUserId &&
      input.revenueCatAppUserId &&
      input.billingConfigUserId === input.currentUserId &&
      !input.billingConfigLoading,
  );
}

function detectBillingPlatform(): "ios" | "android" | "web" {
  if (isCapacitorIOS()) return "ios";
  if (isWrapperPresent()) return "android";
  return "web";
}

export type NativeBillingState = {
  /** "ios" inside Capacitor iOS shell, "android" inside Android wrapper, "web" otherwise. */
  platform: "ios" | "android" | "web";
  /** True when running inside any native shell (iOS Capacitor OR Android wrapper). */
  wrapperPresent: boolean;
  /** True only after the bridge confirms billing is initialised. */
  available: boolean;
  /** True while a purchase is in-flight. */
  purchasing: boolean;
  /**
   * When wrapperPresent && !available: explains why billing isn't ready.
   * Callers must NOT fall back to Razorpay in a native shell — store policy
   * requires using the native payment method (Apple IAP or Google Play).
   */
  unavailableReason: string | null;
  priceByPlan: Partial<Record<Exclude<Plan, "free">, string>>;
  /** Numeric store prices for monthly-equivalent math (RevenueCat / Play / App Store). */
  storePricesByPlan: Partial<Record<Exclude<Plan, "free">, StorePlanPrice>>;
  purchase: (
    plan: Exclude<Plan, "free">,
  ) => Promise<{ ok: boolean; reason?: string; userCancelled?: boolean }>;
  restore: () => Promise<boolean>;
};

/**
 * Unified native billing hook — auto-detects the current shell:
 *
 *   iOS Capacitor  → Apple IAP via RevenueCat Purchases plugin
 *   Android wrapper → Google Play via window.AmyNestBillingNative bridge
 *   Browser/PWA     → wrapperPresent: false, callers show Razorpay / web flow
 */
export function useNativeBilling(): NativeBillingState {
  const [platform, setPlatform] = useState<"ios" | "android" | "web">(
    () => detectBillingPlatform(),
  );
  const iosShell = platform === "ios";
  const androidWrapper = platform === "android";
  const wrapperPresent = iosShell || androidWrapper;

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const syncPlatform = () => {
      if (cancelled) return;
      const next = detectBillingPlatform();
      setPlatform((current) => (current === next ? current : next));
      attempts += 1;
      if (next === "web" && attempts < 20) {
        window.setTimeout(syncPlatform, 250);
      }
    };
    syncPlatform();
    window.addEventListener("focus", syncPlatform);
    window.addEventListener("pageshow", syncPlatform);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", syncPlatform);
      window.removeEventListener("pageshow", syncPlatform);
    };
  }, []);

  // Android bridge (refreshed when the inject polyfill / WebMessageListener attaches)
  const [androidBridge, setAndroidBridge] = useState<NativeBilling | null>(() =>
    androidWrapper ? getNativeBilling() : null,
  );

  useEffect(() => {
    if (!androidWrapper) {
      setAndroidBridge(null);
      return;
    }
    let cancelled = false;
    const syncBridge = () => {
      if (cancelled) return;
      setAndroidBridge(getNativeBilling());
    };
    void waitForBillingBridge().then(() => {
      if (!cancelled) syncBridge();
    });
    window.addEventListener("amynest-billing-bridge-ready", syncBridge);
    window.addEventListener("focus", syncBridge);
    window.addEventListener("pageshow", syncBridge);
    return () => {
      cancelled = true;
      window.removeEventListener("amynest-billing-bridge-ready", syncBridge);
      window.removeEventListener("focus", syncBridge);
      window.removeEventListener("pageshow", syncBridge);
    };
  }, [androidWrapper]);

  const { user } = useUser();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const currentUserId = user?.id ?? null;
  const currentUserIdRef = useRef<string | null>(currentUserId);

  const [available, setAvailable] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [packageMap, setPackageMap] = useState<RcConfig["packageMap"] | null>(null);
  const [revenueCatAppUserId, setRevenueCatAppUserId] = useState<string | null>(null);
  const [billingConfigUserId, setBillingConfigUserId] = useState<string | null>(null);
  const [billingConfigLoading, setBillingConfigLoading] = useState(false);
  const [priceByPlan, setPriceByPlan] = useState<Partial<Record<Exclude<Plan, "free">, string>>>({});
  const [storePricesByPlan, setStorePricesByPlan] = useState<
    Partial<Record<Exclude<Plan, "free">, StorePlanPrice>>
  >({});
  const [purchasing, setPurchasing] = useState(false);
  const userIdSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    setAvailable(false);
    setUnavailableReason(null);
    setPackageMap(null);
    setRevenueCatAppUserId(null);
    setBillingConfigUserId(null);
    setBillingConfigLoading(false);
    setPriceByPlan({});
    setStorePricesByPlan({});
    userIdSyncedRef.current = null;
  }, [platform, currentUserId]);

  const loadRevenueCatConfig = useCallback(
    async (): Promise<RcConfig | null> => {
      if (!wrapperPresent || !currentUserId) return null;
      const requestedUserId = currentUserId;
      setBillingConfigLoading(true);
      try {
        const res = await authFetch(getApiUrl("/api/subscription/rc-config"));
        if (!res.ok) return null;
        const cfg = await parseApiJson<RcConfig>(res);
        if (currentUserIdRef.current !== requestedUserId) return null;
        setRevenueCatAppUserId(cfg.appUserId);
        setBillingConfigUserId(requestedUserId);
        setPackageMap(cfg.packageMap);
        return cfg;
      } catch {
        return null;
      } finally {
        if (currentUserIdRef.current === requestedUserId) {
          setBillingConfigLoading(false);
        }
      }
    },
    [wrapperPresent, currentUserId, authFetch],
  );

  const requireRevenueCatAppUserId = useCallback(async (): Promise<string | null> => {
    if (
      currentUserId &&
      revenueCatAppUserId &&
      billingConfigUserId === currentUserId
    ) {
      return revenueCatAppUserId;
    }
    const cfg = await loadRevenueCatConfig();
    return cfg?.appUserId ?? null;
  }, [billingConfigUserId, currentUserId, loadRevenueCatConfig, revenueCatAppUserId]);

  useEffect(() => {
    if (!wrapperPresent || !currentUserId) return;
    let cancelled = false;
    const run = async () => {
      const cfg = await loadRevenueCatConfig();
      if (!cancelled && !cfg) {
        setUnavailableReason("Loading your billing account. Please try again in a moment.");
      }
    };
    void run();
    const onRetry = () => {
      if (!cancelled) void run();
    };
    window.addEventListener("focus", onRetry);
    window.addEventListener("pageshow", onRetry);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onRetry);
      window.removeEventListener("pageshow", onRetry);
    };
  }, [wrapperPresent, currentUserId, loadRevenueCatConfig]);

  const billingReady = isCanonicalBillingReady({
    nativeAvailable: available,
    wrapperPresent,
    currentUserId,
    billingConfigUserId,
    revenueCatAppUserId,
    billingConfigLoading,
  });

  const billingConfigUnavailableReason =
    billingConfigLoading ||
    (wrapperPresent && currentUserId && !billingReady)
      ? "Loading your billing account. Please try again in a moment."
      : unavailableReason;

  const probeIosBilling = useCallback(async () => {
    if (!iosShell || !user?.id) return;
    const appUserId = await requireRevenueCatAppUserId();
    if (!appUserId) {
      setAvailable(false);
      setUnavailableReason("Loading your billing account. Please try again in a moment.");
      return;
    }
    const result = await initIOSBilling(appUserId);
    if (!result.ok) {
      setAvailable(false);
      setPriceByPlan({});
      setStorePricesByPlan({});
      setUnavailableReason(result.reason);
      return;
    }

    let monthly = await getIOSPackageForPlan("monthly");
    let sixMonth = await getIOSPackageForPlan("six_month");
    let yearly = await getIOSPackageForPlan("yearly");

    for (let attempt = 0; attempt < 4 && !monthly && !sixMonth && !yearly; attempt++) {
      await new Promise((r) => setTimeout(r, 1200));
      [monthly, sixMonth, yearly] = await Promise.all([
        getIOSPackageForPlan("monthly"),
        getIOSPackageForPlan("six_month"),
        getIOSPackageForPlan("yearly"),
      ]);
    }

    const hasStorePlans = !!(monthly || sixMonth || yearly);
    setAvailable(hasStorePlans);
    setUnavailableReason(
      hasStorePlans
        ? null
        : "Subscription plans are not loaded from the App Store yet. Confirm products are live in App Store Connect and linked in RevenueCat, then reopen the app.",
    );
    const nextStore: Partial<Record<Exclude<Plan, "free">, StorePlanPrice>> = {};
    if (monthly?.product.priceString) {
      nextStore.monthly = {
        amount: monthly.product.price,
        currency: monthly.product.currencyCode,
        priceString: monthly.product.priceString,
      };
    }
    if (sixMonth?.product.priceString) {
      nextStore.six_month = {
        amount: sixMonth.product.price,
        currency: sixMonth.product.currencyCode,
        priceString: sixMonth.product.priceString,
      };
    }
    if (yearly?.product.priceString) {
      nextStore.yearly = {
        amount: yearly.product.price,
        currency: yearly.product.currencyCode,
        priceString: yearly.product.priceString,
      };
    }
    setStorePricesByPlan(nextStore);
    setPriceByPlan({
      ...(nextStore.monthly?.priceString ? { monthly: nextStore.monthly.priceString } : {}),
      ...(nextStore.six_month?.priceString ? { six_month: nextStore.six_month.priceString } : {}),
      ...(nextStore.yearly?.priceString ? { yearly: nextStore.yearly.priceString } : {}),
    });
  }, [iosShell, requireRevenueCatAppUserId, user?.id]);

  // ── iOS: init RevenueCat + probe availability (retry on focus) ───────────
  useEffect(() => {
    if (!iosShell || !user?.id) return;
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await probeIosBilling();
    };
    void run();
    const onRetry = () => {
      if (!cancelled) void probeIosBilling();
    };
    window.addEventListener("focus", onRetry);
    window.addEventListener("pageshow", onRetry);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onRetry);
      window.removeEventListener("pageshow", onRetry);
    };
  }, [iosShell, user?.id, probeIosBilling]);

  // ── Android: probe Google Play Billing availability ───────────────────────
  useEffect(() => {
    if (!androidWrapper) return;
    let cancelled = false;

    const runProbe = async () => {
      const ok = await probeBillingAvailability();
      if (cancelled) return;
      setAvailable(ok === true);
      if (ok === true) {
        setUnavailableReason(null);
        return;
      }
      const bridgeMissing =
        typeof window !== "undefined" &&
        !window.AmyNestBillingNative &&
        typeof window.__AMYNEST_BILLING !== "string";
      setUnavailableReason(
        ok === false
          ? bridgeMissing
            ? "Google Play billing did not connect to the app. Update from the Play Store, then fully close and reopen AmyNest."
            : "In-app purchases aren't available right now. Please update the app from the Play Store, or contact support if this keeps happening."
          : null,
      );
    };

    void runProbe();
    const onRetry = () => {
      if (!cancelled) void runProbe();
    };
    window.addEventListener("amynest-billing-bridge-ready", onRetry);
    window.addEventListener("focus", onRetry);
    window.addEventListener("pageshow", onRetry);
    return () => {
      cancelled = true;
      window.removeEventListener("amynest-billing-bridge-ready", onRetry);
      window.removeEventListener("focus", onRetry);
      window.removeEventListener("pageshow", onRetry);
    };
  }, [androidWrapper]);

  // ── Android: sync user id to RevenueCat once billing is ready ────────────
  useEffect(() => {
    if (!androidBridge || !available || !currentUserId) return;
    if (!revenueCatAppUserId || billingConfigUserId !== currentUserId) return;
    const appUserId = revenueCatAppUserId;
    if (userIdSyncedRef.current === appUserId) return;
    let cancelled = false;
    void (async () => {
      const res = await androidBridge.setUserId(appUserId);
      if (!cancelled && (res == null || res.ok !== false)) {
        userIdSyncedRef.current = appUserId;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [androidBridge, available, billingConfigUserId, currentUserId, revenueCatAppUserId]);

  // ── Android: load plan → RC package mapping from backend ─────────────────
  useEffect(() => {
    if (!androidWrapper || !available || !currentUserId) return;
    let cancelled = false;
    const requestedUserId = currentUserId;
    void (async () => {
      try {
        const res = await authFetch(getApiUrl("/api/subscription/rc-config"));
        if (!res.ok) return;
        const cfg = (await parseApiJson<RcConfig>(res));
        if (cancelled || currentUserIdRef.current !== requestedUserId) return;
        setRevenueCatAppUserId(cfg.appUserId);
        setBillingConfigUserId(requestedUserId);
        setPackageMap(cfg.packageMap);
        const offerings = await androidBridge?.getOfferings();
        if (!offerings?.ok) return;
        const nextPrices: Partial<Record<Exclude<Plan, "free">, string>> = {};
        const nextStore: Partial<Record<Exclude<Plan, "free">, StorePlanPrice>> = {};
        for (const plan of ["monthly", "six_month", "yearly"] as const) {
          const nativePackageId = cfg.packageMap[plan];
          const pkg = offerings.data.packages.find(
            (p) => p.identifier === nativePackageId || p.productId === nativePackageId,
          );
          if (!pkg?.priceString) continue;
          nextPrices[plan] = pkg.priceString;
          const amount =
            pkg.priceAmountMicros > 0
              ? pkg.priceAmountMicros / 1_000_000
              : pkg.priceString
                ? Number.NaN
                : 0;
          nextStore[plan] = {
            amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
            currency: pkg.currencyCode || "USD",
            priceString: pkg.priceString,
          };
        }
        if (!cancelled) {
          setPriceByPlan(nextPrices);
          setStorePricesByPlan(nextStore);
        }
      } catch {
        /* ignore — paywall shows error when user taps Buy */
      }
    })();
    return () => { cancelled = true; };
  }, [androidWrapper, androidBridge, available, authFetch, currentUserId]);

  // ── purchase ──────────────────────────────────────────────────────────────
  const purchase = useCallback(
    async (
      plan: Exclude<Plan, "free">,
    ): Promise<{ ok: boolean; reason?: string; userCancelled?: boolean }> => {
      const guestBlock = getGuestCheckoutBlock(user);
      if (guestBlock.blocked) {
        return { ok: false, reason: guestBlock.message };
      }
      if (!billingReady) {
        return { ok: false, reason: billingConfigUnavailableReason ?? "Billing is not available." };
      }
      const canonicalAppUserId = await requireRevenueCatAppUserId();
      if (!canonicalAppUserId) {
        return { ok: false, reason: "Loading your billing account. Please try again in a moment." };
      }

      setPurchasing(true);
      try {
        // ── iOS Apple IAP ─────────────────────────────────────────────────
        if (iosShell) {
          const planKey = plan === "monthly"
            ? "monthly"
            : plan === "yearly"
              ? "yearly"
              : "six_month";
          const pkg = await getIOSPackageForPlan(planKey as "monthly" | "six_month" | "yearly");
          if (!pkg) {
            return { ok: false, reason: "This plan is not available on the App Store right now." };
          }
          const result = await purchaseIOSPackage(pkg);
          if (result.ok) {
            const finalized = await finalizeNativePurchase(authFetch, qc);
            return { ok: finalized.isPremium, reason: finalized.isPremium ? undefined : "Premium is activating — please wait a moment and try Restore Purchases." };
          }
          return result;
        }

        // ── Android Google Play ───────────────────────────────────────────
        if (!androidBridge) {
          return { ok: false, reason: "Google Play Billing is not available." };
        }
        const login = await androidBridge.setUserId(canonicalAppUserId);
        if (login?.ok === false) {
          return { ok: false, reason: "Could not link your account to Google Play billing." };
        }
        const map = packageMap;
        if (!map) return { ok: false, reason: "Loading plans — please retry in a moment." };
        const pkgId = map[plan];
        if (!pkgId) return { ok: false, reason: `No Google Play product mapped for ${plan}.` };

        const result = (await androidBridge.purchase(pkgId)) as NativePurchaseResult;
        if (!result.ok) {
          return {
            ok: false,
            userCancelled: result.userCancelled === true,
            reason: result.userCancelled ? undefined : result.error || "Google Play purchase failed.",
          };
        }
        const finalized = await finalizeNativePurchase(authFetch, qc);
        return {
          ok: finalized.isPremium,
          reason: finalized.isPremium ? undefined : "Payment received — premium is activating. Wait a few seconds or tap Restore Purchases.",
        };
      } catch (err) {
        return {
          ok: false,
          reason: err instanceof Error ? err.message : "Purchase failed. Please try again.",
        };
      } finally {
        setPurchasing(false);
      }
    },
    [iosShell, androidBridge, billingReady, packageMap, qc, authFetch, billingConfigUnavailableReason, requireRevenueCatAppUserId, user],
  );

  // ── restore ───────────────────────────────────────────────────────────────
  const restore = useCallback(async (): Promise<boolean> => {
    const guestBlock = getGuestCheckoutBlock(user);
    if (guestBlock.blocked) return false;
    if (!billingReady) return false;
    const canonicalAppUserId = await requireRevenueCatAppUserId();
    if (!canonicalAppUserId) return false;

    if (iosShell) {
      const init = await initIOSBilling(canonicalAppUserId);
      if (!init.ok) return false;
      const result = await restoreIOSPurchases();
      if (result.ok) {
        const finalized = await finalizeNativeRestore(authFetch, qc);
        return finalized.isPremium;
      }
      return false;
    }

    if (!androidBridge) return false;
    const login = await androidBridge.setUserId(canonicalAppUserId);
    if (login?.ok === false) return false;
    const res = await androidBridge.restore();
    if (res.ok) {
      const finalized = await finalizeNativeRestore(authFetch, qc);
      return finalized.isPremium;
    }
    return false;
  }, [iosShell, androidBridge, billingReady, qc, authFetch, requireRevenueCatAppUserId, user]);

  return {
    platform,
    wrapperPresent,
    available: billingReady,
    purchasing,
    unavailableReason: billingConfigUnavailableReason,
    priceByPlan,
    storePricesByPlan,
    purchase,
    restore,
  };
}
