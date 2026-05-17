import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { applyActionCode } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { resetVerificationRateLimit } from "@/lib/email-verification-rate";
import { logFirebaseAuthError } from "@/lib/firebase-auth-error";
import { parseFirebaseActionParams } from "@/lib/firebase-action-params";
import { waitForFirebaseAuthReady } from "@/lib/wait-for-firebase-auth-ready";

type VerifyStatus = "verifying" | "success" | "error";

const REDIRECT_DELAY_MS = 3000;

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

const LOGIN_BUTTON: React.CSSProperties = {
  display: "inline-block",
  padding: "14px 32px",
  borderRadius: 999,
  background: "linear-gradient(90deg, hsl(var(--brand-purple-500)) 0%, hsl(var(--brand-pink-500)) 100%)",
  color: "#fff",
  fontSize: "16px",
  fontWeight: 700,
  textDecoration: "none",
  boxShadow: "0 0 24px rgba(236,72,153,0.45)",
};

function readActionParams(): { mode: string | null; oobCode: string | null } {
  const fromSearch = new URLSearchParams(window.location.search);
  const mode = fromSearch.get("mode");
  const oobCode = fromSearch.get("oobCode") ?? fromSearch.get("oob_code");
  if (mode && oobCode) return { mode, oobCode };

  const parsed = parseFirebaseActionParams();
  return { mode: parsed.mode, oobCode: parsed.oobCode };
}

export default function VerifyEmailActionPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<VerifyStatus>("verifying");

  useEffect(() => {
    const { mode, oobCode } = readActionParams();

    console.info("[verify-email-action] Link opened", { mode, hasCode: Boolean(oobCode) });

    if (mode !== "verifyEmail" || !oobCode) {
      setStatus("error");
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await waitForFirebaseAuthReady();

        if (cancelled) return;

        await applyActionCode(firebaseAuth, oobCode);

        if (cancelled) return;

        const user = firebaseAuth.currentUser;
        if (user) {
          await user.reload();
          await user.getIdToken(true);
          resetVerificationRateLimit(user.uid);
        }

        console.info("[verify-email-action] Email verified successfully");
        setStatus("success");

        setTimeout(() => {
          if (!cancelled) setLocation("/sign-in");
        }, REDIRECT_DELAY_MS);
      } catch (err: unknown) {
        if (cancelled) return;
        console.error("Verification failed:", err);
        logFirebaseAuthError("verify-email-action:applyActionCode", err);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  return (
    <div style={SHELL}>
      <div style={CARD}>
        {status === "verifying" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <h1 style={{ margin: "0 0 12px", fontSize: "22px", fontWeight: 800, color: "#fff" }}>
              {t("screens.verify_email_action.verifying")}
            </h1>
          </>
        )}

        {status === "success" && (
          <>
            <p style={{
              margin: "0 0 24px",
              fontSize: "15px",
              color: "rgba(134,239,172,0.95)",
              lineHeight: 1.55,
              fontWeight: 600,
            }}>
              {t("screens.verify_email_action.success_message")}
            </p>
            <Link href="/sign-in" style={LOGIN_BUTTON}>
              {t("screens.verify_email_action.go_to_login")}
            </Link>
            <p style={{ marginTop: 16, fontSize: "12px", color: "rgba(200,180,255,0.45)" }}>
              {t("screens.verify_email_action.redirect_hint", { seconds: 3 })}
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <p style={{
              margin: "0 0 24px",
              fontSize: "15px",
              color: "rgba(252,165,165,0.95)",
              lineHeight: 1.55,
              fontWeight: 600,
            }}>
              {t("screens.verify_email_action.error_message")}
            </p>
            <Link href="/sign-in" style={LOGIN_BUTTON}>
              {t("screens.verify_email_action.go_to_login")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
