import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { isFirebaseAuthReady } from "@/lib/firebase";
import { resolveFirebaseAuthRedirectResult } from "@/lib/firebase-oauth-redirect";
import { prettyAuthError, logFirebaseAuthError } from "@/lib/auth-errors";
import { AuthBootShell } from "@/components/auth-boot-shell";

/**
 * Legacy Apple JS SDK callback route. Web sign-in now uses Firebase redirect
 * (completes on /sign-in via OAuthRedirectHandler). This page recovers users
 * who land here after an old redirect or misconfigured Return URL.
 */
export default function AppleAuthCallbackPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        if (!isFirebaseAuthReady()) {
          await new Promise((r) => setTimeout(r, 500));
        }
        if (cancelled) return;

        const result = await resolveFirebaseAuthRedirectResult();
        if (cancelled) return;

        if (result?.user) {
          setLocation("/");
          return;
        }

        setError(t("screens.auth_action.invalid_link"));
      } catch (err: unknown) {
        if (cancelled) return;
        logFirebaseAuthError("apple:callback", err);
        setError(prettyAuthError(err) || t("auth.apple_sign_in_failed"));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setLocation, t]);

  if (error) {
    return (
      <AuthBootShell>
        <p style={{ color: "hsl(var(--brand-red-400))", textAlign: "center" }}>
          {error}
        </p>
        <button
          type="button"
          onClick={() => setLocation("/sign-in")}
          style={{
            marginTop: 16,
            padding: "12px 24px",
            borderRadius: 999,
            border: "none",
            background:
              "linear-gradient(90deg, hsl(var(--brand-purple-500)), hsl(var(--brand-pink-500)))",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {t("screens.sign_in.back_to_sign_in_button")}
        </button>
      </AuthBootShell>
    );
  }

  return <AuthBootShell />;
}
