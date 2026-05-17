import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { applyActionCode } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { resetVerificationRateLimit } from "@/lib/email-verification-rate";
import { formatAuthErrorForUi, logFirebaseAuthError } from "@/lib/firebase-auth-error";
import { parseFirebaseActionParams } from "@/lib/firebase-action-params";

type VerifyState = "verifying" | "verified" | "error" | "invalid";

const SHELL: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 16px",
  background: [
    "radial-gradient(circle at 50% 42%, rgba(100,40,200,0.20) 0%, transparent 58%)",
    "linear-gradient(175deg, #0a061a 0%, #120a2e 55%, #050010 100%)",
  ].join(", "),
};

const CARD: React.CSSProperties = {
  background: "rgba(18,10,40,0.75)",
  border: "1px solid rgba(168,85,247,0.18)",
  borderRadius: "20px",
  padding: "32px 28px",
  backdropFilter: "blur(16px)",
  boxShadow: "0 8px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(168,85,247,0.12)",
  width: "100%",
  maxWidth: "420px",
  textAlign: "center",
};

/** Optional gentle redirect — user can tap sign in sooner */
const REDIRECT_DELAY_MS = 12_000;

export default function VerifyEmailActionPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [state, setState] = useState<VerifyState>("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const { mode, oobCode } = parseFirebaseActionParams();

    console.info("[verify-email-action] Link opened", { mode, hasCode: Boolean(oobCode) });

    if (mode !== "verifyEmail" || !oobCode) {
      setState("invalid");
      setErrorMessage(t("screens.verify_email_action.invalid_link"));
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await applyActionCode(firebaseAuth, oobCode);
        if (cancelled) return;

        const user = firebaseAuth.currentUser;
        if (user) {
          await user.reload();
          await user.getIdToken(true);
          resetVerificationRateLimit(user.uid);
        }

        console.info("[verify-email-action] Email verified successfully");
        setState("verified");

        setTimeout(() => {
          if (!cancelled) setLocation("/sign-in");
        }, REDIRECT_DELAY_MS);
      } catch (err: unknown) {
        if (cancelled) return;
        logFirebaseAuthError("verify-email-action:applyActionCode", err);
        setState("error");
        setErrorMessage(formatAuthErrorForUi(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setLocation, t]);

  return (
    <div style={SHELL}>
      <div style={CARD}>
        {state === "verifying" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <h1 style={{ margin: "0 0 12px", fontSize: "22px", fontWeight: 800, color: "#fff" }}>
              {t("screens.verify_email_action.verifying")}
            </h1>
            <p style={{ margin: 0, fontSize: "14px", color: "rgba(200,180,255,0.65)", lineHeight: 1.5 }}>
              {t("screens.verify_email_action.verifying_hint")}
            </p>
          </>
        )}

        {state === "verified" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h1 style={{ margin: "0 0 12px", fontSize: "22px", fontWeight: 800, color: "#fff" }}>
              {t("screens.verify_email_action.success_title")}
            </h1>
            <p style={{ margin: "0 0 12px", fontSize: "15px", color: "rgba(134,239,172,0.95)", lineHeight: 1.55, fontWeight: 600 }}>
              {t("screens.verify_email_action.success_body")}
            </p>
            <p style={{ margin: "0 0 24px", fontSize: "14px", color: "rgba(200,180,255,0.70)", lineHeight: 1.5 }}>
              {t("screens.verify_email_action.success_app_hint")}
            </p>
            <Link
              href="/sign-in"
              style={{
                display: "inline-block",
                padding: "14px 32px",
                borderRadius: 999,
                background: "linear-gradient(90deg, hsl(var(--brand-purple-500)) 0%, hsl(var(--brand-pink-500)) 100%)",
                color: "#fff",
                fontSize: "16px",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 0 24px rgba(236,72,153,0.45)",
              }}
            >
              {t("screens.verify_email_action.sign_in_button")}
            </Link>
            <p style={{ marginTop: 16, fontSize: "12px", color: "rgba(200,180,255,0.45)" }}>
              {t("screens.verify_email_action.redirect_hint")}
            </p>
          </>
        )}

        {(state === "error" || state === "invalid") && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ margin: "0 0 12px", fontSize: "22px", fontWeight: 800, color: "#fff" }}>
              {t("screens.verify_email_action.error_title")}
            </h1>
            <p style={{
              margin: "0 0 24px", fontSize: "14px",
              color: "rgba(252,165,165,0.9)", lineHeight: 1.5,
            }}>
              {errorMessage ?? t("screens.verify_email_action.error_generic")}
            </p>
            <Link href="/sign-in" style={{ color: "hsl(var(--brand-purple-400))", fontSize: "14px" }}>
              {t("screens.verify_email_action.sign_in_button")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
