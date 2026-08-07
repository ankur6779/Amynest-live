import { useEffect, useState, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { signOut as fbSignOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { isEmailVerificationBypassEmail } from "@/lib/email-verification-bypass";
import { sendUserEmailVerification } from "@/lib/email-verification";
import { getVerificationRateStatus, UX_COOLDOWN_MS } from "@/lib/email-verification-rate";
import {
  consumeVerificationSendError,
  formatAuthErrorForUi,
  logFirebaseAuthError,
  prettyAuthError,
} from "@/lib/firebase-auth-error";
import { waitForFirebaseUser } from "@/lib/wait-for-firebase-user";
import { syncUserEmailVerificationFromServer } from "@/lib/firebase-auth-listener";
import { resolvePostVerifyDestination } from "@/lib/post-verify-destination";
import {
  buildCanonicalAuthActionHref,
  parseFirebaseActionParams,
} from "@/lib/firebase-action-params";
import { RouteLoadingShell } from "@/components/route-loading-shell";
import {
  buildKeepKeepsake,
  buildVerifyKeepCopy,
  calmKeepAuthError,
} from "@/lib/first-experience/signup-keep";
import { KeepKeepsakeCard } from "@/components/keep-keepsake-card";

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

const RESEND_COOLDOWN_SEC = Math.ceil(UX_COOLDOWN_MS / 1000);

async function postVerifyPath(): Promise<string> {
  return resolvePostVerifyDestination();
}

/** Inbox / resend UI after sign-up. Email action links use /auth/action. */
export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const { mode, oobCode } = parseFirebaseActionParams();

  useEffect(() => {
    if (mode === "verifyEmail" && oobCode) {
      setLocation(buildCanonicalAuthActionHref() ?? "/auth/action");
    }
  }, [mode, oobCode, setLocation]);

  if (mode === "verifyEmail" && oobCode) {
    return <RouteLoadingShell />;
  }

  return <VerifyEmailInboxPage />;
}

function VerifyEmailInboxPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const email = decodeURIComponent(params.get("email") ?? "");
  const sentOnArrival = params.get("sent") === "1";
  const sendFailedFromPrev = params.get("sendFailed") === "1";
  const verifyKeep = buildVerifyKeepCopy();
  const keepMode = verifyKeep.keepMode;
  const keepsake = keepMode ? buildKeepKeepsake() : null;

  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const softenError = useCallback(
    (raw: string) => (keepMode ? calmKeepAuthError(raw) : raw),
    [keepMode],
  );

  const goHomeIfVerified = useCallback(async () => {
    const user = firebaseAuth.currentUser;
    const bypassFromUrl = isEmailVerificationBypassEmail(email);
    if (bypassFromUrl) {
      setLocation(await postVerifyPath());
      return;
    }
    if (!user) return;
    if (isEmailVerificationBypassEmail(user.email)) {
      setLocation(await postVerifyPath());
      return;
    }
    try {
      await syncUserEmailVerificationFromServer(user);
      if (user.emailVerified) {
        setLocation(await postVerifyPath());
      }
    } catch {
      /* ignore */
    }
  }, [setLocation, email]);

  useEffect(() => {
    if (isEmailVerificationBypassEmail(email)) {
      void postVerifyPath().then(setLocation);
    }
  }, [email, setLocation]);

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

  // Wait for Firebase session after sign-up/sign-in redirect.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const user = await waitForFirebaseUser();
      if (cancelled) return;
      setAuthReady(true);
      if (!user) {
        console.warn("[verify-email] No Firebase session after redirect");
        if (sendFailedFromPrev || !sentOnArrival) {
          setError(
            softenError(
              "You are not signed in. Go back to Sign in and try again. (app/no-auth-session)",
            ),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sendFailedFromPrev, sentOnArrival, softenError]);

  // After sign-in/sign-up we already sent once — show success + UX cooldown only (no API call).
  useEffect(() => {
    if (!authReady) return;
    const user = firebaseAuth.currentUser;
    if (!user || user.emailVerified) return;
    if (isEmailVerificationBypassEmail(user.email ?? email)) return;

    if (sentOnArrival) {
      setMessage(
        keepMode
          ? "Confirmation sent — the keepsake stays protected."
          : t("screens.verify_email.resent"),
      );
      const { uxCooldownSeconds } = getVerificationRateStatus(user.uid);
      setCooldown(Math.max(uxCooldownSeconds, RESEND_COOLDOWN_SEC));
      return;
    }

    if (sendFailedFromPrev) {
      const stashed = consumeVerificationSendError();
      if (stashed) {
        setError(softenError(formatAuthErrorForUi(stashed)));
        console.error("[verify-email] Previous send failed:", stashed);
      } else {
        setError(
          softenError(t("screens.verify_email.resend_error")),
        );
      }
    }
  }, [authReady, sentOnArrival, sendFailedFromPrev, t, softenError, keepMode]);

  async function onResend() {
    setError(null);
    setMessage(null);
    let fbUser = firebaseAuth.currentUser;
    if (!fbUser) {
      fbUser = await waitForFirebaseUser(3000);
    }
    if (!fbUser) {
      setError(
        softenError(
          "You are not signed in. Go back to Sign in and try again. (app/no-auth-session)",
        ),
      );
      return;
    }
    const rate = getVerificationRateStatus(fbUser.uid);
    if (!rate.canSend && rate.blockedUntil) {
      const seconds = Math.max(1, Math.ceil((rate.blockedUntil - Date.now()) / 1000));
      setCooldown(seconds);
      setError(softenError(prettyAuthError({ code: "auth/too-many-requests" })));
      return;
    }

    setBusy(true);
    try {
      await sendUserEmailVerification(fbUser);
      setMessage(
        keepMode
          ? "Confirmation sent — the keepsake stays protected."
          : t("screens.verify_email.resent"),
      );
      const after = getVerificationRateStatus(fbUser.uid);
      setCooldown(Math.max(after.uxCooldownSeconds, RESEND_COOLDOWN_SEC));
    } catch (err: unknown) {
      logFirebaseAuthError("verify-email:resend", err);
      const code = (err as { code?: string })?.code;
      if (code === "auth/too-many-requests") {
        setCooldown(60);
      } else {
        const after = getVerificationRateStatus(fbUser.uid);
        if (after.uxCooldownSeconds > 0) {
          setCooldown(after.uxCooldownSeconds);
        }
      }
      const msg = formatAuthErrorForUi(err);
      setError(softenError(msg || t("screens.verify_email.resend_error")));
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
    setLocation(keepMode ? "/sign-in?from=first-experience" : "/sign-in");
  }

  const shellBackground = keepMode
    ? [
        "radial-gradient(ellipse 70% 50% at 50% 18%, rgba(212,175,120,0.10) 0%, transparent 55%)",
        "linear-gradient(175deg, #0c0a08 0%, #14110d 52%, #070605 100%)",
      ].join(", ")
    : [
        "radial-gradient(circle at 50% 42%, rgba(100,40,200,0.20) 0%, transparent 58%)",
        "linear-gradient(175deg, #0a061a 0%, #120a2e 55%, #050010 100%)",
      ].join(", ");

  const waveShadow = keepMode
    ? [
        "0 0 0  80px rgba(212,175,120,0.03)",
        "0 0 0 170px rgba(212,175,120,0.02)",
        "0 0 0 290px rgba(180,140,80,0.015)",
        "0 0 0 440px rgba(120,90,40,0.01)",
      ].join(", ")
    : [
        "0 0 0  80px rgba(168,85,247,0.04)",
        "0 0 0 170px rgba(168,85,247,0.03)",
        "0 0 0 290px rgba(100,50,200,0.02)",
        "0 0 0 440px rgba(80,30,160,0.015)",
      ].join(", ");

  const cardStyle = keepMode
    ? {
        background: "rgba(20,16,12,0.78)",
        border: "1px solid rgba(212,175,120,0.22)",
        borderRadius: "20px",
        padding: "28px 24px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.40), inset 0 1px 0 rgba(244,238,230,0.06)",
      }
    : {
        background: "rgba(18,10,40,0.75)",
        border: "1px solid rgba(168,85,247,0.18)",
        borderRadius: "20px",
        padding: "32px 28px",
        backdropFilter: "blur(16px)",
        boxShadow: "0 8px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(168,85,247,0.12)",
      };

  const resendReady = !(busy || cooldown > 0);
  const resendBackground = !resendReady
    ? "rgba(75,65,110,0.5)"
    : keepMode
      ? "linear-gradient(90deg, #c4a574 0%, #e8d4b0 100%)"
      : "linear-gradient(90deg, hsl(var(--brand-purple-500)) 0%, hsl(var(--brand-pink-500)) 100%)";

  return (
    <div
      className={keepMode ? "amynest-auth-page amynest-auth-page--keep" : "amynest-auth-page"}
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
        background: shellBackground,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{CSS}</style>

      <div style={{
        position: "absolute", top: "50%", left: "50%", width: 0, height: 0,
        borderRadius: "50%",
        boxShadow: waveShadow,
        animation: "veWavePulse 8s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>
        {!keepMode ? (
          <>
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
          </>
        ) : null}

        <div style={cardStyle}>
          {keepsake ? <KeepKeepsakeCard keepsake={keepsake} tone="protect" /> : null}

          {!keepMode ? (
            <div style={{
              width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px",
              background: "linear-gradient(135deg, rgba(168,85,247,0.25), rgba(236,72,153,0.18))",
              border: "1px solid rgba(168,85,247,0.30)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28,
            }}>
              📧
            </div>
          ) : null}

          <h1
            data-testid="verify-email-title"
            style={{
              margin: "0 0 8px",
              fontSize: keepMode ? "22px" : "22px",
              fontWeight: keepMode ? 700 : 800,
              color: "#FFFFFF",
              textAlign: "center",
              letterSpacing: "-0.3px",
            }}
          >
            {keepMode ? verifyKeep.title : t("screens.verify_email.title")}
          </h1>

          <p style={{
            margin: "0 0 6px",
            fontSize: "14px",
            color: keepMode ? "rgba(244,238,230,0.62)" : "rgba(200,180,255,0.65)",
            textAlign: "center",
            lineHeight: 1.5,
          }}>
            {keepMode ? verifyKeep.subtitle : t("screens.verify_email.subtitle")}
          </p>

          {email && (
            <p style={{
              margin: "0 0 20px",
              fontSize: "14px",
              color: keepMode ? "#e8d4b0" : "rgba(236,72,153,0.85)",
              fontWeight: 600,
              textAlign: "center",
              wordBreak: "break-all",
            }}>
              {email}
            </p>
          )}

          <p style={{
            margin: "0 0 24px",
            fontSize: "13px",
            color: keepMode ? "rgba(244,238,230,0.48)" : "rgba(200,180,255,0.50)",
            textAlign: "center",
          }}>
            {keepMode ? verifyKeep.spamNote : t("screens.verify_email.spam_note")}
          </p>

          {message && (
            <div style={{
              background: keepMode ? "rgba(212,175,120,0.10)" : "rgba(34,197,94,0.12)",
              border: keepMode
                ? "1px solid rgba(212,175,120,0.28)"
                : "1px solid rgba(34,197,94,0.25)",
              borderRadius: "10px",
              padding: "10px 14px",
              marginBottom: "16px",
              color: keepMode ? "rgba(232,212,176,0.90)" : "rgba(134,239,172,0.90)",
              fontSize: "13px",
              textAlign: "center",
            }}>
              {message}
            </div>
          )}

          {error && (
            <div style={{
              background: keepMode ? "rgba(212,175,120,0.10)" : "rgba(239,68,68,0.12)",
              border: keepMode
                ? "1px solid rgba(212,175,120,0.28)"
                : "1px solid rgba(239,68,68,0.25)",
              borderRadius: "10px",
              padding: "10px 14px",
              marginBottom: "16px",
              color: keepMode ? "rgba(244,220,190,0.92)" : "rgba(252,165,165,0.90)",
              fontSize: "13px",
              textAlign: "center",
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
              background: resendBackground,
              border: "none",
              color: keepMode && resendReady ? "#1a140c" : "#FFFFFF",
              fontSize: "15px",
              fontWeight: 700,
              cursor: busy || cooldown > 0 ? "not-allowed" : "pointer",
              boxShadow: !resendReady
                ? "none"
                : keepMode
                  ? "0 0 24px rgba(212,175,120,0.35), 0 4px 14px rgba(0,0,0,0.28)"
                  : "0 0 24px rgba(236,72,153,0.45), 0 4px 14px rgba(0,0,0,0.28)",
              fontFamily: "inherit",
              marginBottom: "12px",
              transition: "all 0.2s",
            }}
          >
            {busy
              ? (keepMode ? "Sending confirmation…" : t("screens.verify_email.sending"))
              : cooldown > 0
                ? t("screens.verify_email.resend_wait", { seconds: cooldown })
                : keepMode
                  ? verifyKeep.resend
                  : t("screens.verify_email.resend")}
          </button>

          <button
            type="button"
            onClick={() => void onBackToSignIn()}
            style={{
              background: "none",
              border: "none",
              color: keepMode ? "rgba(244,238,230,0.5)" : "rgba(200,180,255,0.50)",
              fontSize: "14px",
              cursor: "pointer",
              fontFamily: "inherit",
              width: "100%",
              padding: "4px 0",
            }}
          >
            {keepMode ? verifyKeep.back : t("screens.verify_email.back_to_sign_in")}
          </button>
        </div>

        <p style={{
          marginTop: "28px",
          fontSize: "11px",
          color: keepMode ? "rgba(244,238,230,0.28)" : "rgba(255,255,255,0.18)",
          textAlign: "center",
        }}>
          {keepMode ? "You’re still in the same story." : t("screens.sign_in.tagline")}
        </p>
      </div>
    </div>
  );
}
