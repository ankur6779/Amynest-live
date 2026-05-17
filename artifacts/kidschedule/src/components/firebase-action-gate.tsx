import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  hasFirebaseActionParams,
  parseFirebaseActionParams,
} from "@/lib/firebase-action-params";
import VerifyEmailActionPage from "@/pages/verify-email-action";
import ResetPasswordPage from "@/pages/reset-password";

const ACTION_PATH_PREFIX = "/auth/action";

/**
 * Intercepts Firebase email links (?mode=&oobCode=) on ANY route — including `/`
 * (landing), `/dashboard`, etc. — and shows the correct handler UI.
 *
 * Verification runs only after the URL is normalized to /auth/action so we never
 * mount the handler twice (which would cancel applyActionCode and burn the oobCode).
 */
export function FirebaseActionGate({ children }: { children: ReactNode }) {
  const [pathname, setLocation] = useLocation();
  const { mode, oobCode } = parseFirebaseActionParams();
  const hasAction = Boolean(mode && oobCode);
  const onCanonicalPath = pathname.startsWith(ACTION_PATH_PREFIX);

  useEffect(() => {
    if (!hasAction) return;

    console.info("[firebase-action-gate] Detected email action link", {
      mode,
      pathname,
      href: window.location.href,
    });

    if (!onCanonicalPath) {
      const qs = new URLSearchParams({ mode: mode!, oobCode: oobCode! });
      const next = `${ACTION_PATH_PREFIX}?${qs.toString()}`;
      if (`${pathname}${window.location.search}` !== next) {
        setLocation(next);
      }
    }
  }, [hasAction, mode, oobCode, pathname, onCanonicalPath, setLocation]);

  if (!hasAction) {
    return <>{children}</>;
  }

  if (!onCanonicalPath) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(175deg, #0a061a 0%, #120a2e 55%, #050010 100%)",
        }}
      >
        <p style={{ margin: 0, fontSize: 15, color: "rgba(200,180,255,0.75)" }}>
          Loading…
        </p>
      </div>
    );
  }

  if (mode === "verifyEmail") {
    return <VerifyEmailActionPage />;
  }

  if (mode === "resetPassword") {
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
