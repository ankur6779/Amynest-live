import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/firebase-auth";
import {
  capturePendingReferralCode,
  clearPendingReferralCode,
  readPendingReferralCode,
  useReferrals,
} from "@/hooks/use-referrals";

/**
 * Captures `?ref=CODE` from the URL into localStorage on every render and,
 * once the user is signed in, posts the pending code to the API exactly once
 * per session. Mounted high in the tree so it works on every page.
 */
export function ReferralAttributionBridge() {
  const { isSignedIn, userId } = useAuth();
  const { attribute } = useReferrals();
  const submittedFor = useRef<string | null>(null);

  // Capture from URL → localStorage on mount.
  useEffect(() => {
    capturePendingReferralCode();
  }, []);

  // Once signed in, submit the pending code (if any). Transient failures
  // (network/server) leave the code in storage and reset the in-memory guard
  // so the next mount can retry; terminal outcomes (success or known
  // attribution errors) clear it.
  useEffect(() => {
    if (!isSignedIn || !userId) return;
    if (submittedFor.current === userId) return;
    const code = readPendingReferralCode();
    if (!code) return;
    submittedFor.current = userId;
    attribute.mutate(code, {
      onSuccess: () => {
        clearPendingReferralCode();
      },
      onError: (err) => {
        const reason = err instanceof Error ? err.message : "";
        const terminal =
          reason === "invalid_code" ||
          reason === "self_referral" ||
          reason === "already_referred_by_other";
        if (terminal) {
          clearPendingReferralCode();
        } else {
          // Allow next mount / next sign-in event to retry.
          submittedFor.current = null;
        }
      },
    });
  }, [isSignedIn, userId, attribute]);

  return null;
}
