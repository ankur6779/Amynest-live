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
import type { Plan } from "@/hooks/use-subscription";

type RcConfig = {
  provider: "revenuecat";
  entitlementId: string;
  offeringId: string;
  appUserId: string;
  packageMap: Record<Exclude<Plan, "free">, string>;
};

export type NativeBillingState = {
  /** True if the page is running inside the Android wrapper at all. */
  wrapperPresent: boolean;
  /** True only after the bridge confirms RevenueCat is initialised. */
  available: boolean;
  /** True while a purchase is in-flight. */
  purchasing: boolean;
  /**
   * If `wrapperPresent && !available`, this holds the reason — callers
   * should show a blocking error instead of falling back to Razorpay
   * (Play policy forbids external payment for digital subscriptions).
   */
  unavailableReason: string | null;
  purchase: (
    plan: Exclude<Plan, "free">,
  ) => Promise<{ ok: boolean; reason?: string; userCancelled?: boolean }>;
  restore: () => Promise<boolean>;
};

/**
 * Detects the Google Play Billing bridge injected by the Android wrapper and
 * exposes a small, paywall-ready API. In a regular browser it returns
 * `wrapperPresent: false` and the paywall keeps the Razorpay flow.
 */
export function useNativeBilling(): NativeBillingState {
  const wrapperPresent = useMemo(() => isWrapperPresent(), []);
  const bridge = useMemo<NativeBilling | null>(
    () => (wrapperPresent ? getNativeBilling() : null),
    [wrapperPresent],
  );

  const { user } = useUser();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();

  const [available, setAvailable] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const [packageMap, setPackageMap] = useState<RcConfig["packageMap"] | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const userIdSyncedRef = useRef<string | null>(null);

  // Probe billing availability once.
  useEffect(() => {
    if (!wrapperPresent) return;
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
    return () => {
      cancelled = true;
    };
  }, [wrapperPresent]);

  // Sync Clerk user id to RevenueCat so the webhook can match purchases back
  // to the right backend account. Runs once per user once billing is ready.
  useEffect(() => {
    if (!bridge || !available || !user?.id) return;
    if (userIdSyncedRef.current === user.id) return;
    void bridge.setUserId(user.id);
    userIdSyncedRef.current = user.id;
  }, [bridge, available, user?.id]);

  // Pull plan → RC package mapping from the backend (single source of truth).
  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await authFetch(getApiUrl("/api/subscription/rc-config"));
        if (!res.ok) return;
        const cfg = (await res.json()) as RcConfig;
        if (!cancelled) setPackageMap(cfg.packageMap);
      } catch {
        /* ignore — paywall surfaces an error if the user actually taps Buy */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [available, authFetch]);

  const purchase = useCallback(
    async (
      plan: Exclude<Plan, "free">,
    ): Promise<{ ok: boolean; reason?: string; userCancelled?: boolean }> => {
      if (!bridge || !available) {
        return { ok: false, reason: unavailableReason ?? "Google Play Billing is not available." };
      }
      const map = packageMap;
      if (!map) return { ok: false, reason: "Loading plans — please retry in a moment." };
      const pkgId = map[plan];
      if (!pkgId) return { ok: false, reason: `No Google Play product mapped for ${plan}.` };

      setPurchasing(true);
      try {
        const result = (await bridge.purchase(pkgId)) as NativePurchaseResult;
        if (!result.ok) {
          return {
            ok: false,
            userCancelled: result.userCancelled === true,
            reason: result.userCancelled
              ? undefined
              : result.error || "Google Play purchase failed.",
          };
        }
        // Optimistic + delayed refresh so the RevenueCat webhook has time to
        // hit the backend and flip the subscription row.
        await qc.invalidateQueries({ queryKey: ["subscription"] });
        for (const delay of [1500, 3500, 6000]) {
          await new Promise((r) => setTimeout(r, delay));
          await qc.invalidateQueries({ queryKey: ["subscription"] });
        }
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          reason: err instanceof Error ? err.message : "Google Play purchase failed.",
        };
      } finally {
        setPurchasing(false);
      }
    },
    [bridge, available, packageMap, qc, unavailableReason],
  );

  const restore = useCallback(async (): Promise<boolean> => {
    if (!bridge || !available) return false;
    const res = await bridge.restore();
    if (res.ok) {
      await qc.invalidateQueries({ queryKey: ["subscription"] });
      return true;
    }
    return false;
  }, [bridge, available, qc]);

  return {
    wrapperPresent,
    available,
    purchasing,
    unavailableReason,
    purchase,
    restore,
  };
}
