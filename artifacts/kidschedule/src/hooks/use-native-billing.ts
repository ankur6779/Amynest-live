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

type RcConfig = {
  provider: "revenuecat";
  entitlementId: string;
  offeringId: string;
  appUserId: string;
  packageMap: Record<Exclude<Plan, "free">, string>;
};

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

  const [available, setAvailable] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [packageMap, setPackageMap] = useState<RcConfig["packageMap"] | null>(null);
  const [priceByPlan, setPriceByPlan] = useState<Partial<Record<Exclude<Plan, "free">, string>>>({});
  const [purchasing, setPurchasing] = useState(false);
  const userIdSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    setAvailable(false);
    setUnavailableReason(null);
    setPackageMap(null);
    setPriceByPlan({});
    userIdSyncedRef.current = null;
  }, [platform]);

  const probeIosBilling = useCallback(async () => {
    if (!iosShell || !user?.id) return;
    const result = await initIOSBilling(user.id);
    if (!result.ok) {
      setAvailable(false);
      setPriceByPlan({});
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
    setPriceByPlan({
      ...(monthly?.product.priceString ? { monthly: monthly.product.priceString } : {}),
      ...(sixMonth?.product.priceString ? { six_month: sixMonth.product.priceString } : {}),
      ...(yearly?.product.priceString ? { yearly: yearly.product.priceString } : {}),
    });
  }, [iosShell, user?.id]);

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
    if (!androidBridge || !available || !user?.id) return;
    if (userIdSyncedRef.current === user.id) return;
    void androidBridge.setUserId(user.id);
    userIdSyncedRef.current = user.id;
  }, [androidBridge, available, user?.id]);

  // ── Android: load plan → RC package mapping from backend ─────────────────
  useEffect(() => {
    if (!androidWrapper || !available) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await authFetch(getApiUrl("/api/subscription/rc-config"));
        if (!res.ok) return;
        const cfg = (await res.json()) as RcConfig;
        if (cancelled) return;
        setPackageMap(cfg.packageMap);
        const offerings = await androidBridge?.getOfferings();
        if (!offerings?.ok) return;
        const nextPrices: Partial<Record<Exclude<Plan, "free">, string>> = {};
        for (const plan of ["monthly", "six_month", "yearly"] as const) {
          const nativePackageId = cfg.packageMap[plan];
          const pkg = offerings.data.packages.find(
            (p) => p.identifier === nativePackageId || p.productId === nativePackageId,
          );
          if (pkg?.priceString) nextPrices[plan] = pkg.priceString;
        }
        if (!cancelled) setPriceByPlan(nextPrices);
      } catch {
        /* ignore — paywall shows error when user taps Buy */
      }
    })();
    return () => { cancelled = true; };
  }, [androidWrapper, androidBridge, available, authFetch]);

  // ── purchase ──────────────────────────────────────────────────────────────
  const purchase = useCallback(
    async (
      plan: Exclude<Plan, "free">,
    ): Promise<{ ok: boolean; reason?: string; userCancelled?: boolean }> => {
      if (!available) {
        return { ok: false, reason: unavailableReason ?? "Billing is not available." };
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
            // Invalidate subscription cache (webhook may take a moment)
            await qc.invalidateQueries({ queryKey: ["subscription"] });
            await qc.invalidateQueries({ queryKey: ["feature-usage"] });
            for (const delay of [1500, 3500, 6000]) {
              await new Promise((r) => setTimeout(r, delay));
              await qc.invalidateQueries({ queryKey: ["subscription"] });
            }
            window.dispatchEvent(new Event("amynest:refresh-subscription"));
          }
          return result;
        }

        // ── Android Google Play ───────────────────────────────────────────
        if (!androidBridge) {
          return { ok: false, reason: "Google Play Billing is not available." };
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
        await qc.invalidateQueries({ queryKey: ["subscription"] });
        await qc.invalidateQueries({ queryKey: ["feature-usage"] });
        for (const delay of [1500, 3500, 6000]) {
          await new Promise((r) => setTimeout(r, delay));
          await qc.invalidateQueries({ queryKey: ["subscription"] });
        }
        window.dispatchEvent(new Event("amynest:refresh-subscription"));
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          reason: err instanceof Error ? err.message : "Purchase failed. Please try again.",
        };
      } finally {
        setPurchasing(false);
      }
    },
    [iosShell, androidBridge, available, packageMap, qc, unavailableReason],
  );

  // ── restore ───────────────────────────────────────────────────────────────
  const restore = useCallback(async (): Promise<boolean> => {
    if (!available) return false;

    if (iosShell) {
      const result = await restoreIOSPurchases();
      if (result.ok) {
        await qc.invalidateQueries({ queryKey: ["subscription"] });
        await qc.invalidateQueries({ queryKey: ["feature-usage"] });
        window.dispatchEvent(new Event("amynest:refresh-subscription"));
        return result.isPremium;
      }
      return false;
    }

    if (!androidBridge) return false;
    const res = await androidBridge.restore();
    if (res.ok) {
      await qc.invalidateQueries({ queryKey: ["subscription"] });
      await qc.invalidateQueries({ queryKey: ["feature-usage"] });
      window.dispatchEvent(new Event("amynest:refresh-subscription"));
      return true;
    }
    return false;
  }, [iosShell, androidBridge, available, qc]);

  return {
    platform,
    wrapperPresent,
    available,
    purchasing,
    unavailableReason,
    priceByPlan,
    purchase,
    restore,
  };
}
