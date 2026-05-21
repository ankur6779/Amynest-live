import { useEffect } from "react";
import { useLocation } from "wouter";
import { isFirebaseAuthReady } from "@/lib/firebase";
import { prettyAuthError } from "@/lib/auth-errors";
import { useToast } from "@/hooks/use-toast";
import {
  ENABLE_APPLE_SIGN_IN,
  ENABLE_GOOGLE_SIGN_IN,
} from "@/lib/auth-feature-flags";
import { resolveFirebaseAuthRedirectResult } from "@/lib/firebase-oauth-redirect";

/**
 * Completes Firebase OAuth redirect (Apple / Google) after the user returns from
 * the provider. Must run on every web load — not gated by ENABLE_OAUTH_SIGN_IN.
 */
export function OAuthRedirectHandler() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!ENABLE_APPLE_SIGN_IN && !ENABLE_GOOGLE_SIGN_IN) return;
    let cancelled = false;

    const run = async () => {
      if (!isFirebaseAuthReady()) return;

      try {
        const result = await resolveFirebaseAuthRedirectResult();
        if (cancelled || !result?.user) return;
        setLocation("/");
      } catch (err) {
        if (cancelled) return;
        const message = prettyAuthError(err);
        if (!message) return;
        toast({
          variant: "destructive",
          title: "Sign-in failed",
          description: message,
        });
        setLocation("/sign-in");
      }
    };

    const timer = window.setTimeout(() => {
      void run();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [setLocation, toast]);

  return null;
}
