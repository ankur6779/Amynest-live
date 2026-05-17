import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { formatAuthErrorForUi, logFirebaseAuthError } from "@/lib/firebase-auth-error";
import { parsePasswordResetActionParams } from "@/lib/password-reset";

type PageState = "loading" | "invalid" | "form" | "success";

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

const CARD: React.CSSProperties = {
  background: "rgba(18,10,40,0.75)",
  border: "1px solid rgba(168,85,247,0.18)",
  borderRadius: "20px",
  padding: "32px 28px",
  backdropFilter: "blur(16px)",
  boxShadow: "0 8px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(168,85,247,0.12)",
  width: "100%",
  maxWidth: "420px",
};

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const { mode, oobCode: code } = parsePasswordResetActionParams();

    console.info("[reset-password] Link opened", { mode, hasCode: Boolean(code) });

    if (mode !== "resetPassword" || !code) {
      setPageState("invalid");
      setError(t("screens.reset_password.invalid_link"));
      return;
    }

    setOobCode(code);

    void (async () => {
      try {
        const email = await verifyPasswordResetCode(firebaseAuth, code);
        if (cancelled) return;
        setAccountEmail(email);
        setPageState("form");
        console.info("[reset-password] Code verified for", email);
      } catch (err: unknown) {
        if (cancelled) return;
        logFirebaseAuthError("reset-password:verifyPasswordResetCode", err);
        setPageState("invalid");
        setError(formatAuthErrorForUi(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [t]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!oobCode) return;

    if (password.length < 6) {
      setError(t("screens.reset_password.password_too_short"));
      return;
    }
    if (password !== confirm) {
      setError(t("screens.reset_password.password_mismatch"));
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await confirmPasswordReset(firebaseAuth, oobCode, password);
      console.info("[reset-password] Password updated successfully");
      setPageState("success");
      setTimeout(() => setLocation("/sign-in"), 3000);
    } catch (err: unknown) {
      logFirebaseAuthError("reset-password:confirmPasswordReset", err);
      setError(formatAuthErrorForUi(err));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    password.length >= 6 && confirm.length >= 6 && password === confirm && !busy;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
        background: [
          "radial-gradient(circle at 50% 42%, rgba(100,40,200,0.20) 0%, transparent 58%)",
          "linear-gradient(175deg, #0a061a 0%, #120a2e 55%, #050010 100%)",
        ].join(", "),
      }}
    >
      <div style={CARD}>
        {pageState === "loading" && (
          <>
            <h1
              style={{
                margin: "0 0 12px",
                fontSize: "22px",
                fontWeight: 800,
                color: "#fff",
                textAlign: "center",
              }}
            >
              {t("screens.reset_password.verifying")}
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "rgba(200,180,255,0.65)",
                textAlign: "center",
              }}
            >
              {t("screens.reset_password.verifying_hint")}
            </p>
          </>
        )}

        {pageState === "invalid" && (
          <>
            <h1
              style={{
                margin: "0 0 12px",
                fontSize: "22px",
                fontWeight: 800,
                color: "#fff",
                textAlign: "center",
              }}
            >
              {t("screens.reset_password.invalid_title")}
            </h1>
            {error && (
              <p
                style={{
                  margin: "0 0 20px",
                  fontSize: "13px",
                  color: "rgba(252,165,165,0.9)",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                {error}
              </p>
            )}
            <div style={{ textAlign: "center" }}>
              <Link href="/sign-in" style={{ color: "hsl(var(--brand-purple-400))", fontSize: "14px" }}>
                {t("screens.reset_password.back_to_sign_in")}
              </Link>
            </div>
          </>
        )}

        {pageState === "success" && (
          <>
            <div style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>✓</div>
            <h1
              style={{
                margin: "0 0 12px",
                fontSize: "22px",
                fontWeight: 800,
                color: "#fff",
                textAlign: "center",
              }}
            >
              {t("screens.reset_password.success_title")}
            </h1>
            <p
              style={{
                margin: "0 0 16px",
                fontSize: "14px",
                color: "rgba(200,180,255,0.65)",
                textAlign: "center",
              }}
            >
              {t("screens.reset_password.success_body")}
            </p>
            <div style={{ textAlign: "center" }}>
              <Link href="/sign-in" style={{ color: "hsl(var(--brand-purple-400))", fontSize: "14px" }}>
                {t("screens.reset_password.sign_in_now")}
              </Link>
            </div>
          </>
        )}

        {pageState === "form" && (
          <>
            <h1
              style={{
                margin: "0 0 8px",
                fontSize: "22px",
                fontWeight: 800,
                color: "#fff",
                textAlign: "center",
              }}
            >
              {t("screens.reset_password.title")}
            </h1>
            {accountEmail && (
              <p
                style={{
                  margin: "0 0 20px",
                  fontSize: "14px",
                  color: "rgba(236,72,153,0.85)",
                  fontWeight: 600,
                  textAlign: "center",
                  wordBreak: "break-all",
                }}
              >
                {accountEmail}
              </p>
            )}
            <p
              style={{
                margin: "0 0 20px",
                fontSize: "13px",
                color: "rgba(200,180,255,0.55)",
                textAlign: "center",
              }}
            >
              {t("screens.reset_password.subtitle")}
            </p>

            {error && (
              <div
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  marginBottom: "16px",
                  color: "rgba(252,165,165,0.90)",
                  fontSize: "13px",
                  textAlign: "center",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={(e) => void onSubmit(e)}>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 13,
                  color: "rgba(200,180,255,0.7)",
                }}
              >
                {t("screens.reset_password.new_password")}
              </label>
              <div style={{ position: "relative", marginBottom: 14 }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  style={{ ...INPUT_STYLE, paddingRight: 72 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "rgba(200,180,255,0.55)",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {showPass ? t("screens.sign_in.hide") : t("screens.sign_in.show")}
                </button>
              </div>

              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 13,
                  color: "rgba(200,180,255,0.7)",
                }}
              >
                {t("screens.reset_password.confirm_password")}
              </label>
              <input
                type={showPass ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
                style={{ ...INPUT_STYLE, marginBottom: 20 }}
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
                {busy
                  ? t("screens.reset_password.updating")
                  : t("screens.reset_password.submit")}
              </button>
            </form>

            <p style={{ marginTop: 16, textAlign: "center" }}>
              <Link href="/sign-in" style={{ color: "rgba(200,180,255,0.5)", fontSize: 14 }}>
                {t("screens.reset_password.back_to_sign_in")}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
