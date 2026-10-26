import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/firebase-auth-hooks";
import {
  capturePendingGiftCode,
  clearPendingGiftCode,
  readPendingGiftCodeForUser,
  useReferrals,
} from "@/hooks/use-referrals";

/**
 * Captures `?gift=CODE` from the URL and redeems once the user is signed in.
 * Pending codes are uid-bound so a shared-device account switch cannot burn
 * another parent's gift under the wrong Firebase session.
 */
export function GiftAttributionBridge() {
  const { isSignedIn, userId } = useAuth();
  const { redeemGift } = useReferrals();
  const submittedFor = useRef<string | null>(null);

  useEffect(() => {
    capturePendingGiftCode(userId);
  }, [userId]);

  useEffect(() => {
    if (!isSignedIn || !userId) return;
    if (submittedFor.current === userId) return;
    const code = readPendingGiftCodeForUser(userId);
    if (!code) return;
    submittedFor.current = userId;
    redeemGift.mutate(code, {
      onSuccess: () => {
        clearPendingGiftCode();
      },
      onError: (err) => {
        const reason = err instanceof Error ? err.message : "";
        const terminal =
          reason === "not_found" ||
          reason === "already_redeemed" ||
          reason === "expired" ||
          reason === "self_redeem";
        if (terminal) {
          clearPendingGiftCode();
        } else {
          submittedFor.current = null;
        }
      },
    });
  }, [isSignedIn, userId, redeemGift]);

  return null;
}
