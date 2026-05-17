import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { resetVerificationRateLimit } from "@/lib/email-verification-rate";
import { formatAuthErrorForUi, logFirebaseAuthError } from "@/lib/firebase-auth-error";
import {
  buildCanonicalAuthActionHref,
  parseFirebaseActionParams,
} from "@/lib/firebase-action-params";
import { waitForFirebaseAuthReady } from "@/lib/wait-for-firebase-auth-ready";

type ActionStatus =
  | "loading"
  | "invalid"
  | "emailVerified"
  | "showResetForm"
  | "passwordUpdated"
  | "error";

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

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  height: "48px",
  padding: "0 16px",
  borderRadius: "14px",
  outline: "none",
  fontSize: "15px",
  background: "rgba(10,6,26,0.72)",
  border: "1px solid rgba(168,85,247,0.25)",
  color: "#F0E8FF",
  fontFamily: "inherit",
  boxSizing: "border-box",
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

function Spinner() {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        width: 40,
        height: 40,
        margin: "0 auto",
        borderRadius: "50%",
        border: "3px solid rgba(168,85,247,0.2)",
        borderTopColor: "hsl(var(--brand-pink-500))",
        animation: "authActionSpin 0.8s linear infinite",
      }}
    />
  );
}

/**
 * Single handler for Firebase email action links at /auth/action.
 * Supports verifyEmail and resetPassword modes.
 */
export default function AuthActionPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ActionStatus>("loading");
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const processedRef = useRef(false);

  useEffect(() => {
    const canonical = buildCanonicalAuthActionHref();
    if (canonical && `${window.location.pathname}${window.location.search}` !== canonical) {
      window.history.replaceState(null, "", canonical);
    }
  }, []);

  useEffect(() => {
    if (processedRef.current) return;

    const { mode, oobCode: code } = parseFirebaseActionParams();
    console.info("[auth-action] Processing", { mode, hasCode: Boolean(code) });

    if (!mode || !code) {
      setStatus("invalid");
      return;
    }

    setOobCode(code);
    processedRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        await waitForFirebaseAuthReady();
        if (cancelled) return;

        if (mode === "verifyEmail") {
          await applyActionCode(firebaseAuth, code);
          if (cancelled) return;

          const user = firebaseAuth.currentUser;
          if (user) {
            await user.reload();
            await user.getIdToken(true);
            resetVerificationRateLimit(user.uid);
          }

          setStatus("emailVerified");
          return;
        }

        if (mode === "resetPassword") {
          const email = await verifyPasswordResetCode(firebaseAuth, code);
          if (cancelled) return;
          setAccountEmail(email);
          setStatus("showResetForm");
          return;
        }

        setStatus("invalid");
      } catch (err: unknown) {
        if (cancelled) return;
        console.error("[auth-action] Failed:", err);
        logFirebaseAuthError("auth-action:handle", err);
        setStatus("error");
        setFormError(formatAuthErrorForUi(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    if (!oobCode) return;

    if (password.length < 6) {
      setFormError(t("screens.reset_password.password_too_short"));
      return;
    }
    if (password !== confirm) {
      setFormError(t("screens.reset_password.password_mismatch"));
      return;
    }

    setFormError(null);
    setBusy(true);
    try {
      await confirmPasswordReset(firebaseAuth, oobCode, password);
      setStatus("passwordUpdated");
    } catch (err: unknown) {
      logFirebaseAuthError("auth-action:confirmPasswordReset", err);
      setFormError(formatAuthErrorForUi(err));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    password.length >= 6 && confirm.length >= 6 && password === confirm && !busy;

  return (
    <>
      <AuthActionSpinnerStyles />
      <div style={SHELL}>
        <div style={CARD}>
          {status === "loading" && (
            <>
              <Spinner />
              <p style={{ margin: "16px 0 0", fontSize: 15, color: "rgba(200,180,255,0.75)" }}>
                {t("screens.auth_action.processing")}
              </p>
            </>
          )}

          {status === "emailVerified" && (
            <>
              <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 800, color: "#fff" }}>
                {t("screens.auth_action.email_verified_title")}
              </h2>
              <p style={{ margin: "0 0 24px", fontSize: 15, color: "rgba(134,239,172,0.95)", lineHeight: 1.55 }}>
                {t("screens.verify_email_action.success_message")}
              </p>
              <Link href="/sign-in" style={LOGIN_BUTTON}>
                {t("screens.verify_email_action.go_to_login")}
              </Link>
            </>
          )}

          {status === "showResetForm" && (
            <>
              <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#fff" }}>
                {t("screens.reset_password.title")}
              </h2>
              {accountEmail && (
                <p style={{ margin: "0 0 16px", fontSize: 14, color: "rgba(236,72,153,0.85)", fontWeight: 600 }}>
                  {accountEmail}
                </p>
              )}
              {formError && (
                <p style={{ margin: "0 0 16px", fontSize: 13, color: "rgba(252,165,165,0.9)" }}>{formError}</p>
              )}
              <form onSubmit={(e) => void handleReset(e)} style={{ textAlign: "left" }}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("screens.reset_password.new_password")}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  style={{ ...INPUT_STYLE, marginBottom: 12 }}
                />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t("screens.reset_password.confirm_password")}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  style={{ ...INPUT_STYLE, marginBottom: 16 }}
                />
                <button
                  type="submit"
                  disabled={!canSubmit}
                  style={{
                    width: "100%",
                    height: 48,
                    borderRadius: 999,
                    border: "none",
                    background: canSubmit
                      ? "linear-gradient(90deg, hsl(var(--brand-purple-500)) 0%, hsl(var(--brand-pink-500)) 100%)"
                      : "rgba(75,65,110,0.5)",
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    fontFamily: "inherit",
                  }}
                >
                  {busy ? t("screens.reset_password.updating") : t("screens.reset_password.submit")}
                </button>
              </form>
            </>
          )}

          {status === "passwordUpdated" && (
            <>
              <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 800, color: "#fff" }}>
                {t("screens.reset_password.success_title")}
              </h2>
              <p style={{ margin: "0 0 24px", fontSize: 15, color: "rgba(134,239,172,0.95)", lineHeight: 1.55 }}>
                {t("screens.auth_action.password_updated")}
              </p>
              <Link href="/sign-in" style={LOGIN_BUTTON}>
                {t("screens.verify_email_action.go_to_login")}
              </Link>
            </>
          )}

          {(status === "error" || status === "invalid") && (
            <>
              <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 800, color: "#fff" }}>
                Link unavailable
              </h2>
              <p style={{ margin: "0 0 24px", fontSize: 15, color: "rgba(252,165,165,0.95)", lineHeight: 1.55 }}>
                {formError ??
                  (status === "invalid"
                    ? t("screens.verify_email_action.invalid_link")
                    : t("screens.verify_email_action.error_message"))}
              </p>
              <Link href="/sign-in" style={LOGIN_BUTTON}>
                {t("screens.verify_email_action.go_to_login")}
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function AuthActionSpinnerStyles() {
  return (
    <style>{`
      @keyframes authActionSpin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  );
}
