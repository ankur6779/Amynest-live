import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/firebase-auth-hooks";
import {
  capturePendingReferralCode,
  clearPendingReferralCode,
  readPendingReferralCodeForUser,
  useReferrals,
} from "@/hooks/use-referrals";

/**
 * Captures `?ref=CODE` from the URL into localStorage and, once signed in,
 * posts attribution exactly once per uid. Pending codes are uid-bound so a
 * shared-device account switch cannot permanently attribute the referral to
 * the wrong referee.
 */
export function ReferralAttributionBridge() {
  const { isSignedIn, userId } = useAuth();
  const { attribute } = useReferrals();
  const submittedFor = useRef<string | null>(null);

  useEffect(() => {
    capturePendingReferralCode(userId);
  }, [userId]);

  useEffect(() => {
    if (!isSignedIn || !userId) return;
    if (submittedFor.current === userId) return;
    const code = readPendingReferralCodeForUser(userId);
    if (!code) return;
    submittedFor.current = userId;
    attribute.mutate(code, {
      onSuccess: () => {
        clearPendingReferralCode();
        import("@/lib/growth-analytics").then(({ trackGrowthEvent }) => {
          trackGrowthEvent("referral_accepted", { code });
        });
      },
      onError: (err) => {
        const reason = err instanceof Error ? err.message : "";
        const terminal =
          reason === "invalid_code" ||
          reason === "self_referral" ||
          reason === "already_referred_by_other" ||
          reason === "attribution_window_expired" ||
          reason === "referrer_daily_cap";
        if (terminal) {
          clearPendingReferralCode();
        } else {
          submittedFor.current = null;
        }
      },
    });
  }, [isSignedIn, userId, attribute]);

  return null;
}
