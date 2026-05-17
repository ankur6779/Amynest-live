import type { ReactNode } from "react";
import { parseFirebaseActionParams } from "@/lib/firebase-action-params";
import VerifyEmailActionPage from "@/pages/verify-email-action";
import ResetPasswordPage from "@/pages/reset-password";

/**
 * Catches Firebase email links that land on `/` (homepage) with ?mode=&oobCode=
 * instead of /auth/action — common when the custom domain opens the root URL.
 */
export function FirebaseActionGate({ children }: { children: ReactNode }) {
  const { mode, oobCode } = parseFirebaseActionParams();

  if (mode === "verifyEmail" && oobCode) {
    return <VerifyEmailActionPage />;
  }

  if (mode === "resetPassword" && oobCode) {
    return <ResetPasswordPage />;
  }

  return <>{children}</>;
}
