import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  hasFirebaseActionParams,
  parseFirebaseActionParams,
} from "@/lib/firebase-action-params";
import VerifyEmailActionPage from "@/pages/verify-email-action";
import ResetPasswordPage from "@/pages/reset-password";

/**
 * Intercepts Firebase email links (?mode=&oobCode=) on ANY route — including `/`
 * (landing), `/dashboard`, etc. — and shows the correct handler UI.
 */
export function FirebaseActionGate({ children }: { children: ReactNode }) {
  const [pathname, setLocation] = useLocation();
  const { mode, oobCode } = parseFirebaseActionParams();

  useEffect(() => {
    if (!mode || !oobCode) return;

    console.info("[firebase-action-gate] Detected email action link", {
      mode,
      pathname,
      href: window.location.href,
    });

    // Normalize URL so bookmarks/refreshes keep params on /auth/action
    if (!pathname.startsWith("/auth/action")) {
      const qs = new URLSearchParams({ mode, oobCode });
      const next = `/auth/action?${qs.toString()}`;
      if (`${pathname}${window.location.search}` !== next) {
        setLocation(next);
      }
    }
  }, [mode, oobCode, pathname, setLocation]);

  if (mode === "verifyEmail" && oobCode) {
    return <VerifyEmailActionPage />;
  }

  if (mode === "resetPassword" && oobCode) {
    return <ResetPasswordPage />;
  }

  return <>{children}</>;
}

/** Run before React route matching (e.g. in index bootstrap). */
export function peekFirebaseActionMode(): string | null {
  if (typeof window === "undefined") return null;
  if (!hasFirebaseActionParams()) return null;
  return parseFirebaseActionParams().mode;
}
