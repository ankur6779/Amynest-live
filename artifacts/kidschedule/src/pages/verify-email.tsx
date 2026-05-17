import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { signOut as fbSignOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { sendEmailOtpApi, verifyEmailOtpApi } from "@/lib/email-otp-api";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const CSS = `
  @keyframes veRingRotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes veRingPulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.03); }
  }
  @keyframes veGlowBreathe {
    0%, 100% { transform: translate(-50%,-50%) scale(1);   opacity: 1; }
    50%      { transform: translate(-50%,-50%) scale(1.1); opacity: 0.72; }
  }
  @keyframes veWavePulse {
    0%, 100% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
    50%      { opacity: 0.6; transform: translate(-50%,-50%) scale(1.08); }
  }
  .ve-otp-slot {
    width: 44px !important;
    height: 52px !important;
    font-size: 22px !important;
    font-weight: 700 !important;
    color: #fff !important;
    border-color: rgba(168,85,247,0.35) !important;
    background: rgba(255,255,255,0.06) !important;
    border-radius: 12px !important;
  }
  .ve-otp-slot[data-active=true] {
    border-color: rgba(236,72,153,0.85) !important;
    box-shadow: 0 0 0 2px rgba(168,85,247,0.25) !important;
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
  const email = decodeURIComponent(new URLSearchParams(search).get("email") ?? "");

  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [sendBusy, setSendBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initialSend = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const mapSendError = useCallback(
    (code: string, fallback?: string) => {
      switch (code) {
        case "cooldown":
        case "rate_limited":
          return t("screens.verify_email.resend_wait", { seconds: cooldown || 45 });
        case "unauthorized":
        case "not_signed_in":
          return t("screens.verify_email.must_sign_in_to_resend");
        case "email_send_failed":
        case "network_error":
        case "invalid_response":
          return fallback ?? t("screens.verify_email.send_error");
        default:
          return fallback ?? t("screens.verify_email.send_error");
      }
    },
    [t, cooldown],
  );

  const mapVerifyError = useCallback(
    (code: string, fallback?: string, attemptsRemaining?: number) => {
      switch (code) {
        case "invalid_otp":
          return attemptsRemaining != null
            ? t("screens.verify_email.wrong_otp_attempts", { count: attemptsRemaining })
            : t("screens.verify_email.wrong_otp");
        case "expired":
          return t("screens.verify_email.expired_otp");
        case "too_many_attempts":
          return t("screens.verify_email.too_many_attempts");
        case "unauthorized":
        case "not_signed_in":
          return t("screens.verify_email.must_sign_in_to_resend");
        default:
          return fallback ?? t("screens.verify_email.verify_error");
      }
    },
    [t],
  );

  const onSendOtp = useCallback(async () => {
    if (!email) return;
    setError(null);
    setMessage(null);
    if (!firebaseAuth.currentUser) {
      setError(t("screens.verify_email.must_sign_in_to_resend"));
      return;
    }
    setSendBusy(true);
    try {
      const result = await sendEmailOtpApi(email);
      if ("ok" in result && result.ok) {
        if (result.devOtp) {
          setMessage(t("screens.verify_email.dev_code_hint", { code: result.devOtp }));
        } else {
          setMessage(t("screens.verify_email.code_sent"));
        }
        setCooldown(result.cooldownSeconds);
        return;
      }
      if ("cooldownSeconds" in result && result.cooldownSeconds) {
        setCooldown(result.cooldownSeconds);
      }
      if ("error" in result) {
        setError(mapSendError(result.error, result.message));
      }
    } catch (err: unknown) {
      console.error("[verify-email] send OTP failed:", err);
      setError(
        err instanceof Error && err.message === "not_signed_in"
          ? t("screens.verify_email.must_sign_in_to_resend")
          : err instanceof Error
            ? err.message
            : t("screens.verify_email.send_error"),
      );
    } finally {
      setSendBusy(false);
    }
  }, [email, mapSendError, t]);

  useEffect(() => {
    if (!email || initialSend.current) return;
    if (!firebaseAuth.currentUser) return;
    initialSend.current = true;
    void onSendOtp();
  }, [email, onSendOtp]);

  const onVerify = useCallback(async () => {
    if (otp.length !== 6 || !email) return;
    setError(null);
    setMessage(null);
    setVerifyBusy(true);
    try {
      const result = await verifyEmailOtpApi(email, otp);
      if ("ok" in result && result.ok) {
        const user = firebaseAuth.currentUser;
        if (user) {
          await user.reload();
          await user.getIdToken(true);
        }
        setLocation(postVerifyPath());
        return;
      }
      if ("error" in result) {
        setError(mapVerifyError(result.error, result.message, result.attemptsRemaining));
        if (result.error === "expired") setOtp("");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message === "not_signed_in"
          ? t("screens.verify_email.must_sign_in_to_resend")
          : t("screens.verify_email.verify_error"),
      );
    } finally {
      setVerifyBusy(false);
    }
  }, [email, mapVerifyError, otp, setLocation, t]);

  const lastAutoOtp = useRef("");
  useEffect(() => {
    if (otp.length < 6) {
      lastAutoOtp.current = "";
      return;
    }
    if (verifyBusy || lastAutoOtp.current === otp) return;
    lastAutoOtp.current = otp;
    void onVerify();
  }, [otp, verifyBusy, onVerify]);

  async function onBackToSignIn() {
    try {
      await fbSignOut(firebaseAuth);
    } catch {
      /* best-effort */
    }
    setLocation("/sign-in");
  }

  const canVerify = otp.length === 6 && !verifyBusy;

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

        <div style={{
          width: 110, height: 18, margin: "-4px auto 28px",
          background: "radial-gradient(ellipse at center, rgba(168,85,247,0.50) 0%, rgba(236,72,153,0.28) 45%, transparent 70%)",
          filter: "blur(6px)",
        }} />

        <div style={{
          background: "rgba(18,10,40,0.75)",
          border: "1px solid rgba(168,85,247,0.18)",
          borderRadius: "20px",
          padding: "32px 28px",
          backdropFilter: "blur(16px)",
          boxShadow: "0 8px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(168,85,247,0.12)",
        }}>
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
            margin: "0 0 20px", fontSize: "13px",
            color: "rgba(200,180,255,0.50)", textAlign: "center",
          }}>
            {t("screens.verify_email.otp_hint")}
          </p>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
              disabled={verifyBusy}
            >
              <InputOTPGroup style={{ gap: 8 }}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="ve-otp-slot" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

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
            onClick={() => void onVerify()}
            disabled={!canVerify}
            style={{
              width: "100%", height: "48px", borderRadius: "999px",
              background: !canVerify
                ? "rgba(75,65,110,0.5)"
                : "linear-gradient(90deg, hsl(var(--brand-purple-500)) 0%, hsl(var(--brand-pink-500)) 100%)",
              border: "none", color: "#FFFFFF", fontSize: "15px", fontWeight: 700,
              cursor: !canVerify ? "not-allowed" : "pointer",
              boxShadow: !canVerify ? "none" : "0 0 24px rgba(236,72,153,0.45), 0 4px 14px rgba(0,0,0,0.28)",
              fontFamily: "inherit", marginBottom: "12px", transition: "all 0.2s",
            }}
          >
            {verifyBusy ? t("screens.verify_email.verifying") : t("screens.verify_email.verify_button")}
          </button>

          <button
            type="button"
            onClick={() => void onSendOtp()}
            disabled={sendBusy || cooldown > 0}
            style={{
              width: "100%", height: "44px", borderRadius: "999px",
              background: "transparent",
              border: "1px solid rgba(168,85,247,0.35)",
              color: "rgba(200,180,255,0.85)", fontSize: "14px", fontWeight: 600,
              cursor: sendBusy || cooldown > 0 ? "not-allowed" : "pointer",
              fontFamily: "inherit", marginBottom: "12px", opacity: sendBusy || cooldown > 0 ? 0.6 : 1,
            }}
          >
            {sendBusy
              ? t("screens.verify_email.sending")
              : cooldown > 0
                ? t("screens.verify_email.resend_wait", { seconds: cooldown })
                : t("screens.verify_email.resend_code")}
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
