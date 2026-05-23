import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/firebase-auth-hooks";
import {
  capturePendingGiftCode,
  clearPendingGiftCode,
  readPendingGiftCode,
  useReferrals,
} from "@/hooks/use-referrals";

/**
 * Captures `?gift=CODE` from the URL and redeems once the user is signed in.
 */
export function GiftAttributionBridge() {
  const { isSignedIn, userId } = useAuth();
  const { redeemGift } = useReferrals();
  const submittedFor = useRef<string | null>(null);

  useEffect(() => {
    capturePendingGiftCode();
  }, []);

  useEffect(() => {
    if (!isSignedIn || !userId) return;
    if (submittedFor.current === userId) return;
    const code = readPendingGiftCode();
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
