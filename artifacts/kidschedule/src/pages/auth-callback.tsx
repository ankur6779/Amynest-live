import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { applyActionCode } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { resetVerificationRateLimit } from "@/lib/email-verification-rate";

function postVerifyPath(): string {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
    return "/notify-prompt?next=/";
  }
  return "/";
}

export default function AuthCallbackPage() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const oobCode = params.get("oobCode");

    if (mode !== "verifyEmail" || !oobCode) {
      setError("Invalid verification link.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await applyActionCode(firebaseAuth, oobCode);
        if (cancelled) return;

        const user = firebaseAuth.currentUser;
        if (user) {
          await user.reload();
          await user.getIdToken(true);
          resetVerificationRateLimit(user.uid);
        }

        setLocation(postVerifyPath());
      } catch (err: unknown) {
        if (cancelled) return;
        console.error("[auth/callback] applyActionCode failed:", err);
        setError("This verification link is invalid or has expired.");
      }
    })();

    return () => {
      cancelled = true;
    };
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
      {error ? (
        <>
          <p style={{ marginBottom: 16 }}>{error}</p>
          <a href="/sign-in" style={{ color: "hsl(var(--brand-purple-400))" }}>
            Back to sign in
          </a>
        </>
      ) : (
        <p>Verifying your email…</p>
      )}
    </div>
  );
}

