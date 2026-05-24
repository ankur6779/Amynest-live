import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { isFirebaseAuthReady } from "@/lib/firebase";
import { prettyAuthError } from "@/lib/auth-errors";
import { useToast } from "@/hooks/use-toast";
import {
  ENABLE_APPLE_SIGN_IN,
  ENABLE_GOOGLE_SIGN_IN,
} from "@/lib/auth-feature-flags";
import {
  hasPendingFirebaseOAuthRedirect,
  resolveFirebaseAuthRedirectResult,
} from "@/lib/firebase-oauth-redirect";
import { refreshFirebaseAuthSnapshot } from "@/lib/firebase-auth-listener";
import { navigateAfterOAuthSignIn } from "@/lib/google-auth";
import { resolvePostOAuthDestination } from "@/lib/post-verify-destination";
import { waitForAuthContextAuthenticated } from "@/lib/wait-for-auth-context";

/**
 * Completes Firebase OAuth redirect (Apple / Google) after the user returns from
 * the provider. Must run on every web load — not gated by ENABLE_OAUTH_SIGN_IN.
 */
export function OAuthRedirectHandler() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!ENABLE_APPLE_SIGN_IN && !ENABLE_GOOGLE_SIGN_IN) return;
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    const run = async () => {
      if (!hasPendingFirebaseOAuthRedirect() && !isFirebaseAuthReady()) {
        await new Promise((r) => window.setTimeout(r, 300));
      }
      if (cancelled) return;

      try {
        const result = await resolveFirebaseAuthRedirectResult();
        if (cancelled || !result?.user) return;

        await result.user.getIdToken(true);
        refreshFirebaseAuthSnapshot();
        await waitForAuthContextAuthenticated(12_000);
        const destination = await resolvePostOAuthDestination();
        navigateAfterOAuthSignIn(destination);
      } catch (err) {
        if (cancelled) return;
        const message = prettyAuthError(err);
        if (message) {
          toast({
            variant: "destructive",
            title: "Sign-in failed",
            description: message,
          });
        }
        setLocation("/sign-in");
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [setLocation, toast]);

  return null;
}
