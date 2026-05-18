import { useEffect } from "react";
import { isFirebaseAuthReady } from "@/lib/firebase";
import { prettyAuthError } from "@/lib/auth-errors";
import { useToast } from "@/hooks/use-toast";
import { ENABLE_OAUTH_SIGN_IN } from "@/lib/auth-feature-flags";

/**
 * Completes Google sign-in after Firebase redirect (web/PWA only).
 * Loaded via dynamic import so Capacitor / auth helpers stay out of the initial AppCore parse path.
 */
export function OAuthRedirectHandler() {
  const { toast } = useToast();

  useEffect(() => {
    if (!ENABLE_OAUTH_SIGN_IN) return;
    let cancelled = false;

    const run = async () => {
      if (!isFirebaseAuthReady()) return;

      try {
        const { resolveGoogleRedirectResult } = await import("@/lib/google-auth");
        if (cancelled) return;
        const result = await resolveGoogleRedirectResult();
        if (cancelled || !result) return;
      } catch (err) {
        if (cancelled) return;
        const message = prettyAuthError(err);
        if (!message) return;
        toast({
          variant: "destructive",
          title: "Sign-in failed",
          description: message,
        });
      }
    };

    const timer = window.setTimeout(() => {
      void run();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [toast]);

  return null;
}
