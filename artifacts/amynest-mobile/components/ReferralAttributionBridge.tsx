import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/firebase-auth";
import * as Linking from "expo-linking";
import {
  readPendingReferralCode,
  setPendingReferralCode,
  clearPendingReferralCode,
  useReferrals,
} from "@/hooks/useReferrals";

function extractCode(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = Linking.parse(url);
    const ref = (parsed.queryParams?.ref as string | undefined)?.trim();
    return ref ? ref.toUpperCase() : null;
  } catch {
    return null;
  }
}

/**
 * Captures `?ref=CODE` from the cold-start URL and any incoming deep link, then
 * — once signed in — submits it to the API exactly once per user.
 */
export function ReferralAttributionBridge() {
  const { isSignedIn, userId } = useAuth();
  const { attribute } = useReferrals();
  const submittedFor = useRef<string | null>(null);

  // Capture from cold-start URL.
  useEffect(() => {
    Linking.getInitialURL()
      .then((url) => {
        const code = extractCode(url);
        if (code) setPendingReferralCode(code);
      })
      .catch(() => {});
  }, []);

  // Capture from any subsequent deep link.
  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      const code = extractCode(url);
      if (code) setPendingReferralCode(code);
    });
    return () => sub.remove();
  }, []);

  // Submit pending code once signed in. Transient failures (network) keep the
  // code in storage so the next mount can retry; terminal outcomes (success
  // or known attribution errors) clear it.
  useEffect(() => {
    if (!isSignedIn || !userId) return;
    if (submittedFor.current === userId) return;
    submittedFor.current = userId;
    (async () => {
      const code = await readPendingReferralCode();
      if (!code) return;
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
            submittedFor.current = null;
          }
        },
      });
    })();
  }, [isSignedIn, userId, attribute]);

  return null;
}
