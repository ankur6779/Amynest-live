import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@/lib/firebase-auth-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import {
  getNativeBilling,
  isWrapperPresent,
  probeBillingAvailability,
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
  const iosShell = useMemo(() => isCapacitorIOS(), []);
  const androidWrapper = useMemo(
    () => !iosShell && isWrapperPresent(),
    [iosShell],
  );
  const platform: "ios" | "android" | "web" = iosShell
    ? "ios"
    : androidWrapper
      ? "android"
      : "web";
  const wrapperPresent = iosShell || androidWrapper;

  // Android bridge (null when not in Android wrapper)
  const androidBridge = useMemo<NativeBilling | null>(
    () => (androidWrapper ? getNativeBilling() : null),
    [androidWrapper],
  );

  const { user } = useUser();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();

  const [available, setAvailable] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [packageMap, setPackageMap] = useState<RcConfig["packageMap"] | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const userIdSyncedRef = useRef<string | null>(null);

  // ── iOS: init RevenueCat + probe availability ─────────────────────────────
  useEffect(() => {
    if (!iosShell || !user?.id) return;
    let cancelled = false;

    void (async () => {
      const ok = await initIOSBilling(user.id);
      if (cancelled) return;
      if (ok) {
        setAvailable(true);
      } else {
        setAvailable(false);
        setUnavailableReason(
          "Apple In-App Purchases aren't available right now. Make sure you are signed in to the App Store, then try again.",
        );
      }
    })();

    return () => { cancelled = true; };
  }, [iosShell, user?.id]);

  // ── Android: probe Google Play Billing availability ───────────────────────
  useEffect(() => {
    if (!androidWrapper) return;
    let cancelled = false;
    void probeBillingAvailability().then((ok) => {
      if (cancelled) return;
      setAvailable(ok === true);
      if (ok === false) {
        setUnavailableReason(
          "In-app purchases aren't available right now. Please update the app from the Play Store, or contact support if this keeps happening.",
        );
      }
    });
    return () => { cancelled = true; };
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
        if (!cancelled) setPackageMap(cfg.packageMap);
      } catch {
        /* ignore — paywall shows error when user taps Buy */
      }
    })();
    return () => { cancelled = true; };
  }, [androidWrapper, available, authFetch]);

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
            for (const delay of [1500, 3500, 6000]) {
              await new Promise((r) => setTimeout(r, delay));
              await qc.invalidateQueries({ queryKey: ["subscription"] });
            }
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
        for (const delay of [1500, 3500, 6000]) {
          await new Promise((r) => setTimeout(r, delay));
          await qc.invalidateQueries({ queryKey: ["subscription"] });
        }
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
        return result.isPremium;
      }
      return false;
    }

    if (!androidBridge) return false;
    const res = await androidBridge.restore();
    if (res.ok) {
      await qc.invalidateQueries({ queryKey: ["subscription"] });
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
    purchase,
    restore,
  };
}
