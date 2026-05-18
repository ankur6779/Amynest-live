import { useEffect } from "react";
import { resolveGoogleRedirectResult } from "@/lib/google-auth";
import { prettyAuthError } from "@/lib/auth-errors";
import { useToast } from "@/hooks/use-toast";

/**
 * Completes OAuth sign-in after redirect (Google Firebase redirect + Apple JS callback).
 */
export function OAuthRedirectHandler() {
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        await resolveGoogleRedirectResult();
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

    void run();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  return null;
}
