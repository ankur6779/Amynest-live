import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { signOut as fbSignOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import {
  sendUserEmailVerification,
  shouldSkipVerificationEmailSend,
} from "@/lib/email-verification";
import { prettyAuthError } from "@/lib/auth-errors";

const CSS = `
  @keyframes veRingRotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes veRingPulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.03); }
  }
  @keyframes veWavePulse {
    0%, 100% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
    50%      { opacity: 0.6; transform: translate(-50%,-50%) scale(1.08); }
  }
`;

function NeonRingHero() {
  const { t } = useTranslation();
  return (
    <div style={{ position: "relative", width: 148, height: 148, margin: "0 auto 12px" }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "conic-gradient(from 180deg, hsl(var(--brand-purple-500)), hsl(var(--brand-pink-500)), hsl(var(--brand-purple-400)), hsl(var(--brand-purple-500)))",
        animation: "veRingRotate 8s linear infinite", padding: 3,
      }}>
        <div style={{
          width: "100%", height: "100%", borderRadius: "50%",
          background: "linear-gradient(145deg, #0e0825, #1a0a3e)",
        }} />
      </div>
      <div style={{
        position: "absolute", inset: 6, borderRadius: "50%",
        background: "linear-gradient(145deg, #12082e 0%, #1e0d45 50%, #0a0520 100%)",
        animation: "veRingPulse 4s ease-in-out infinite",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        boxShadow: "inset 0 0 24px rgba(168,85,247,0.18)",
      }}>
        <span style={{
          fontSize: "10px", fontWeight: 700, letterSpacing: "0.25em",
          color: "rgba(200,180,255,0.55)", marginBottom: 2,
        }}>
          {t("screens.sign_in.meet")}
        </span>
        <span style={{
          fontSize: "26px", fontWeight: 900, letterSpacing: "0.08em",
          background: "linear-gradient(135deg, hsl(var(--brand-purple-300)) 0%, hsl(var(--brand-pink-400)) 50%, hsl(var(--brand-purple-400)) 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          AMY
        </span>
      </div>
    </div>
  );
}

const RESEND_COOLDOWN = 30;

function postVerifyPath(): string {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
    return "/notify-prompt?next=/";
  }
  return "/";
}

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const email = decodeURIComponent(params.get("email") ?? "");
  const sendFailedFromPrev = params.get("sendFailed") === "1";

  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoSendStarted = useRef(false);

  const goHomeIfVerified = useCallback(async () => {
    const user = firebaseAuth.currentUser;
    if (!user) return;
    try {
      await user.reload();
      if (user.emailVerified) {
        await user.getIdToken(true);
        setLocation(postVerifyPath());
      }
    } catch {
      /* ignore */
    }
  }, [setLocation]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  // Poll while user may have clicked the link in another tab
  useEffect(() => {
    void goHomeIfVerified();
    const id = setInterval(() => void goHomeIfVerified(), 3000);
    return () => clearInterval(id);
  }, [goHomeIfVerified]);

  // Auto-send when landing from sign-in/sign-up (Firebase session required).
  useEffect(() => {
    if (autoSendStarted.current) return;
    autoSendStarted.current = true;

    const user = firebaseAuth.currentUser;
    if (!user || user.emailVerified) return;
    if (shouldSkipVerificationEmailSend(user.uid)) {
      if (sendFailedFromPrev) {
        setError(t("screens.verify_email.resend_error"));
      }
      return;
    }

    setBusy(true);
    void (async () => {
      try {
        await sendUserEmailVerification(user);
        setMessage(t("screens.verify_email.resent"));
        setCooldown(RESEND_COOLDOWN);
        setError(null);
      } catch (err: unknown) {
        console.error("[verify-email] auto-send failed:", err);
        const msg = prettyAuthError(err);
        setError(msg || t("screens.verify_email.resend_error"));
      } finally {
        setBusy(false);
      }
    })();
  }, [sendFailedFromPrev, t]);

  async function onResend() {
    setError(null);
    setMessage(null);
    const fbUser = firebaseAuth.currentUser;
    if (!fbUser) {
      setError(t("screens.verify_email.must_sign_in_to_resend"));
      return;
    }
    setBusy(true);
    try {
      await sendUserEmailVerification(fbUser);
      setMessage(t("screens.verify_email.resent"));
      setCooldown(RESEND_COOLDOWN);
    } catch (err: unknown) {
      console.error("[verify-email] resend failed:", err);
      const msg = prettyAuthError(err);
      setError(msg || t("screens.verify_email.resend_error"));
    } finally {
      setBusy(false);
    }
  }

  async function onBackToSignIn() {
    try {
      await fbSignOut(firebaseAuth);
    } catch {
      /* best-effort */
    }
    setLocation("/sign-in");
  }

  return (
    <div style={{
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
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{CSS}</style>

      <div style={{
        position: "absolute", top: "50%", left: "50%", width: 0, height: 0,
        borderRadius: "50%",
        boxShadow: [
          "0 0 0  80px rgba(168,85,247,0.04)",
          "0 0 0 170px rgba(168,85,247,0.03)",
          "0 0 0 290px rgba(100,50,200,0.02)",
          "0 0 0 440px rgba(80,30,160,0.015)",
        ].join(", "),
        animation: "veWavePulse 8s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>
        <NeonRingHero />

        <div
          style={{
            width: 110,
            height: 18,
            margin: "-4px auto 28px",
            background:
              "radial-gradient(ellipse at center, rgba(168,85,247,0.50) 0%, rgba(236,72,153,0.28) 45%, transparent 70%)",
            filter: "blur(6px)",
          }}
        />

        <div style={{
          background: "rgba(18,10,40,0.75)",
          border: "1px solid rgba(168,85,247,0.18)",
          borderRadius: "20px",
          padding: "32px 28px",
          backdropFilter: "blur(16px)",
          boxShadow: "0 8px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(168,85,247,0.12)",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px",
            background: "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(236,72,153,0.18))",
            border: "1px solid rgba(168,85,247,0.30)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
          }}>
            📧
          </div>

          <h1 style={{
            margin: "0 0 8px", fontSize: "22px", fontWeight: 800,
            color: "#FFFFFF", textAlign: "center", letterSpacing: "-0.3px",
          }}>
            {t("screens.verify_email.title")}
          </h1>

          <p style={{
            margin: "0 0 6px", fontSize: "14px",
            color: "rgba(200,180,255,0.65)", textAlign: "center", lineHeight: 1.5,
          }}>
            {t("screens.verify_email.subtitle")}
          </p>

          {email && (
            <p style={{
              margin: "0 0 20px", fontSize: "14px",
              color: "rgba(236,72,153,0.85)", fontWeight: 600,
              textAlign: "center", wordBreak: "break-all",
            }}>
              {email}
            </p>
          )}

          <p style={{
            margin: "0 0 24px", fontSize: "13px",
            color: "rgba(200,180,255,0.50)", textAlign: "center",
          }}>
            {t("screens.verify_email.spam_note")}
          </p>

          {message && (
            <div style={{
              background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: "10px", padding: "10px 14px", marginBottom: "16px",
              color: "rgba(134,239,172,0.90)", fontSize: "13px", textAlign: "center",
            }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "10px", padding: "10px 14px", marginBottom: "16px",
              color: "rgba(252,165,165,0.90)", fontSize: "13px", textAlign: "center",
            }}>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => void onResend()}
            disabled={busy || cooldown > 0}
            style={{
              width: "100%", height: "48px", borderRadius: "999px",
              background: busy || cooldown > 0
                ? "rgba(75,65,110,0.5)"
                : "linear-gradient(90deg, hsl(var(--brand-purple-500)) 0%, hsl(var(--brand-pink-500)) 100%)",
              border: "none", color: "#FFFFFF", fontSize: "15px", fontWeight: 700,
              cursor: busy || cooldown > 0 ? "not-allowed" : "pointer",
              boxShadow: busy || cooldown > 0 ? "none" : "0 0 24px rgba(236,72,153,0.45), 0 4px 14px rgba(0,0,0,0.28)",
              fontFamily: "inherit", marginBottom: "12px", transition: "all 0.2s",
            }}
          >
            {busy
              ? t("screens.verify_email.sending")
              : cooldown > 0
                ? t("screens.verify_email.resend_wait", { seconds: cooldown })
                : t("screens.verify_email.resend")}
          </button>

          <button
            type="button"
            onClick={() => void onBackToSignIn()}
            style={{
              background: "none", border: "none",
              color: "rgba(200,180,255,0.50)", fontSize: "14px",
              cursor: "pointer", fontFamily: "inherit", width: "100%",
              padding: "4px 0",
            }}
          >
            {t("screens.verify_email.back_to_sign_in")}
          </button>
        </div>

        <p style={{
          marginTop: "28px", fontSize: "11px", color: "rgba(255,255,255,0.18)",
          textAlign: "center",
        }}>
          {t("screens.sign_in.tagline")}
        </p>
      </div>
    </div>
  );
}
