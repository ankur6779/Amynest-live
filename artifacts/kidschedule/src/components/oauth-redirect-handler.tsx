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
import { getFirebaseAuth } from "@/lib/firebase";
import { refreshFirebaseAuthSnapshot } from "@/lib/firebase-auth-listener";
import { navigateAfterOAuthSignIn } from "@/lib/google-auth";
import { resolvePostOAuthDestination } from "@/lib/post-verify-destination";
import { waitForAuthContextAuthenticated } from "@/lib/wait-for-auth-context";
import { waitForFirebaseUser } from "@/lib/wait-for-firebase-user";

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
      const pendingOAuth = hasPendingFirebaseOAuthRedirect();
      if (!pendingOAuth && !isFirebaseAuthReady()) {
        await new Promise((r) => window.setTimeout(r, 300));
      }
      if (cancelled) return;

      try {
        const result = await resolveFirebaseAuthRedirectResult();
        const user =
          result?.user ??
          (pendingOAuth
            ? (await waitForFirebaseUser(8_000)) ??
              getFirebaseAuth().currentUser
            : null);
        if (cancelled || !user) {
          if (pendingOAuth) {
            toast({
              variant: "destructive",
              title: "Sign-in failed",
              description:
                "Google sign-in could not be completed. Please try again.",
            });
          }
          return;
        }

        await user.getIdToken(true);
        refreshFirebaseAuthSnapshot();
        await waitForAuthContextAuthenticated(12_000).catch(() => {
          refreshFirebaseAuthSnapshot();
        });
        if (!getFirebaseAuth().currentUser) {
          throw Object.assign(
            new Error("Sign-in session could not be established."),
            { code: "app/auth-session-lost" },
          );
        }
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
        if (pendingOAuth) {
          setLocation("/sign-in");
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [setLocation, toast]);

  return null;
}
