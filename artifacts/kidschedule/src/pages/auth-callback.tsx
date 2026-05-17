import { useEffect } from "react";
import { useLocation } from "wouter";
import { parseFirebaseActionParams } from "@/lib/firebase-action-params";

/** Legacy Firebase action URLs (/verify, /auth/callback) → dedicated handlers. */
export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const { mode, oobCode } = parseFirebaseActionParams();

    if (mode === "resetPassword" && oobCode) {
      const qs = new URLSearchParams({ mode, oobCode });
      setLocation(`/reset-password?${qs.toString()}`);
      return;
    }

    if (mode === "verifyEmail" && oobCode) {
      const qs = new URLSearchParams({ mode, oobCode });
      setLocation(`/verify-email?${qs.toString()}`);
      return;
    }

    setLocation("/sign-in");
  }, [setLocation]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "linear-gradient(175deg, #0a061a 0%, #120a2e 55%, #050010 100%)",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <p>Redirecting…</p>
    </div>
  );
}
