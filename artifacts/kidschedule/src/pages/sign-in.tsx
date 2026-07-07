import { parseApiJson } from "@/lib/safe-json-response";
import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { signInWithEmailAndPassword } from "firebase/auth";
import { syncUserEmailVerificationFromServer } from "@/lib/firebase-auth-listener";
import { sendUserPasswordResetEmail } from "@/lib/password-reset";
import { isEmailVerificationBypassEmail } from "@/lib/email-verification-bypass";
import { sendUserEmailVerification } from "@/lib/email-verification";
import { firebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { prettyAuthError, stashVerificationSendError, logFirebaseAuthError } from "@/lib/auth-errors";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { FacebookSignInButton } from "@/components/facebook-sign-in-button";
import { AuthLegalFooter } from "@/components/auth-legal-footer";
import { handleAppleLogin } from "@/lib/apple-auth";
import PhoneAuthFlow from "@/components/phone-auth-flow";
import { PhoneRecaptchaPreload } from "@/components/phone-recaptcha-preload";
import {
  shouldShowGoogleSignIn,
  shouldShowFacebookSignIn,
  shouldShowAppleSignIn,
  shouldShowPhoneOtp,
} from "@/lib/auth-feature-flags";
import { navigateAfterAuth } from "@/lib/auth-navigation";
import { ensureAuthContextSynced } from "@/lib/auth-session-sync";
import { getApiUrl } from "@/lib/api";
import { shouldShowPermissionsSetupPromptAsync } from "@/lib/pwa-android-permissions";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import { resolvePostOAuthDestination } from "@/lib/post-verify-destination";
import { isCapacitorIosShell, isLowMemoryIosClient } from "@/lib/device-lite";
import {
  AUTH_INPUT_CLASS,
  useNativeAuthKeyboard,
} from "@/hooks/use-native-auth-keyboard";
import { AuthKeyboardShell, NATIVE_AUTH_SHELL_PADDING } from "@/components/auth-keyboard-shell";
import { withAuthTimeout } from "@/lib/auth-timeout";
import {
  AUTH_INPUT_STYLE,
  AUTH_SPACING,
  AUTH_SUBMIT_BTN_STYLE,
  AUTH_OAUTH_BTN_STYLE,
  authCardStyle,
  authHeroRingSize,
  authInputGlowBlur,
  authInputGlowFocus,
} from "@/lib/auth-screen-layout";
// ── Animation keyframes (injected once into <head> via <style> in JSX) ───────
const SIGN_IN_CSS = `
  @keyframes siRingRotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes siRingPulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.04); }
  }
  @keyframes siShimmerOrbit {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes siGlowBreathe {
    0%, 100% { transform: translate(-50%,-50%) scale(1);   opacity: 1; }
    50%      { transform: translate(-50%,-50%) scale(1.1); opacity: 0.72; }
  }
  @keyframes siAmyGlow {
    0%, 100% { filter: drop-shadow(0 0 10px rgba(236,72,153,0.50)); }
    50%      { filter: drop-shadow(0 0 22px rgba(236,72,153,0.82)) drop-shadow(0 0 40px rgba(168,85,247,0.42)); }
  }
  @keyframes siFlicker {
    0%, 100% { opacity: 1;   box-shadow: 0 0 8px rgba(255,255,255,0.9), 0 0 18px rgba(168,85,247,0.8); }
    48%      { opacity: 0.55; box-shadow: 0 0 4px rgba(255,255,255,0.5), 0 0 8px rgba(168,85,247,0.4); }
    52%      { opacity: 0.9; }
  }
  @keyframes siWavePulse {
    0%, 100% { transform: translate(-50%,-50%) scale(1);    opacity: 1; }
    50%      { transform: translate(-50%,-50%) scale(1.05); opacity: 0.7; }
  }
  .si-phone-btn:hover {
    background: rgba(168,85,247,0.18) !important;
    box-shadow: 0 0 0 1px rgba(168,85,247,0.70), 0 0 22px rgba(168,85,247,0.45) !important;
  }
  .si-oauth-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    z-index: 2;
  }
  .si-apple-btn:hover:not(:disabled) {
    transform: scale(1.015);
    box-shadow: 0 4px 20px rgba(0,0,0,0.40), 0 0 0 2px rgba(168,85,247,0.45) !important;
  }
  .si-submit-btn {
    transition: transform 0.18s ease, box-shadow 0.18s ease !important;
  }
  .si-submit-btn:hover:not(:disabled) {
    transform: scale(1.025) !important;
    box-shadow: 0 0 42px rgba(236,72,153,0.65), 0 6px 22px rgba(0,0,0,0.38) !important;
  }
`;

function AppleMark() {
  return (
    <svg width="18" height="22" viewBox="0 0 814 1000" aria-hidden fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-109.3-38.5-155.5-115C31.5 711.6.5 486.6 68.5 347.5c33.8-67.6 93.7-110.5 158.9-111.5 62.3-1.1 121.1 41.7 159.5 41.7 37.1 0 106.2-51.4 179-44 30.4 1.3 115.8 12.3 170.7 92.7-4.4 2.7-102 59.6-101.5 177.5zM650.3 71.5C682.7 32.7 704.7 0 704.7 0s-56.1 2.7-119.5 35.3C526.7 55.9 490 79.5 464 110c-30.4 37.5-45.8 84.5-42.4 133.5 44.9 3.4 90.6-22.9 128.7-62.2z" />
    </svg>
  );
}

/** Inline on sign-in page so the button ships in the sign-in chunk (not phone-auth). */
function SignInAppleButton({ onError }: { onError?: (message: string) => void }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const nativeIos = isCapacitorIosShell();

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await withAuthTimeout(handleAppleLogin(), "handleAppleLogin", 45_000);
    } catch (err: unknown) {
      logFirebaseAuthError("apple:sign-in", err);
      const message = prettyAuthError(err);
      if (message) onError?.(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={busy}
      className="si-apple-btn"
      data-testid="button-apple-sign-in"
      style={{
        ...AUTH_OAUTH_BTN_STYLE,
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        background: busy
          ? nativeIos
            ? "rgba(0,0,0,0.72)"
            : "rgba(255,255,255,0.82)"
          : nativeIos
            ? "#000000"
            : "#FFFFFF",
        border: nativeIos
          ? "1px solid rgba(255,255,255,0.35)"
          : "1px solid rgba(255,255,255,0.90)",
        color: nativeIos ? "#FFFFFF" : "#000000",
        cursor: busy ? "not-allowed" : "pointer",
        boxShadow: busy
          ? "none"
          : nativeIos
            ? "0 2px 16px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.12)"
            : "0 2px 16px rgba(0,0,0,0.35), 0 0 0 1px rgba(168,85,247,0.25)",
        flexShrink: 0,
        visibility: "visible",
        opacity: 1,
      }}
    >
      <AppleMark />
      {busy ? t("auth.connecting") : t("auth.continue_with_apple")}
    </button>
  );
}

// ── Input focus / blur handlers ───────────────────────────────────────────────
const glowFocus = authInputGlowFocus;
const glowBlur = authInputGlowBlur;
const INPUT_STYLE = AUTH_INPUT_STYLE;

// ── Neon ring hero (sits above the card) ─────────────────────────────────────
function NeonRingHero() {
  const {
    t
  } = useTranslation();
  const lite = isLowMemoryIosClient();
  const R = authHeroRingSize();
  const INNER = Math.round(R * 0.8);
  const OFF = (R - INNER) / 2; // offset to centre inner inside ring
  const MASK_IN = R / 2 - 7; // transparent up to here (px)
  const MASK_OUT = R / 2 - 3; // ring starts here

  return <div style={{
    position: "relative",
    width: R,
    height: R,
    margin: "0 auto",
    zIndex: 2
  }}>

      {/* Atmospheric outer glow — bleeds outside ring */}
      {!lite ? (
      <div style={{
      position: "absolute",
      top: "50%",
      left: "50%",
      width: 250,
      height: 250,
      transform: "translate(-50%, -50%)",
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(168,85,247,0.28) 0%, rgba(236,72,153,0.18) 45%, transparent 70%)",
      filter: "blur(28px)",
      animation: "siGlowBreathe 3.5s ease-in-out infinite",
      pointerEvents: "none"
    }} />
      ) : null}

      {/* Secondary faint orbit line */}
      <div style={{
      position: "absolute",
      top: -17,
      left: -17,
      width: R + 34,
      height: R + 34,
      borderRadius: "50%",
      border: "1px solid rgba(168,85,247,0.16)",
      pointerEvents: "none"
    }} />

      {/* Pulse wrapper — scale 1 ↔ 1.04, wraps ring + shimmer + inner */}
      <div style={{
      position: "absolute",
      inset: 0,
      animation: lite ? "none" : "siRingPulse 2.8s ease-in-out infinite"
    }}>

        {/* Layer 1: conic-gradient ring */}
        <div style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        background: "conic-gradient(from 0deg, hsl(var(--brand-purple-500)) 0deg, hsl(var(--brand-pink-500)) 90deg, hsl(var(--brand-purple-500)) 180deg, hsl(var(--brand-pink-500)) 270deg, hsl(var(--brand-purple-500)) 360deg)",
        WebkitMaskImage: `radial-gradient(circle, transparent ${MASK_IN}px, black ${MASK_OUT}px)`,
        maskImage: `radial-gradient(circle, transparent ${MASK_IN}px, black ${MASK_OUT}px)`,
        animation: "siRingRotate 11s linear infinite",
        willChange: "transform"
      }} />

        {/* Layer 2: shimmer arc — bright ~16° streak orbiting at 3.5s */}
        <div style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        background: "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0) 5deg, rgba(255,255,255,0.85) 13deg, rgba(255,255,255,0) 21deg, transparent 21deg)",
        WebkitMaskImage: `radial-gradient(circle, transparent ${MASK_IN}px, black ${MASK_OUT}px)`,
        maskImage: `radial-gradient(circle, transparent ${MASK_IN}px, black ${MASK_OUT}px)`,
        animation: "siShimmerOrbit 3.5s linear infinite",
        willChange: "transform"
      }} />

        {/* Layer 4: light flare on ring edge (top-right position) */}
        <div style={{
        position: "absolute",
        width: 8,
        height: 8,
        top: 10,
        right: 22,
        borderRadius: "50%",
        background: "white",
        boxShadow: "0 0 8px rgba(255,255,255,0.9), 0 0 18px rgba(168,85,247,0.8), 0 0 26px rgba(236,72,153,0.6)",
        animation: "siFlicker 2.4s ease-in-out infinite"
      }} />

        {/* Layer 3: inner glass circle — dark centre with depth */}
        <div style={{
        position: "absolute",
        top: OFF,
        left: OFF,
        width: INNER,
        height: INNER,
        borderRadius: "50%",
        background: "radial-gradient(circle at 38% 36%, rgba(26,8,58,0.86) 0%, rgba(8,4,22,0.92) 60%, rgba(3,0,12,0.96) 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2
      }}>
          <span style={{
          display: "block",
          fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
          fontSize: 11,
          fontWeight: 300,
          letterSpacing: "3px",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.80)",
          lineHeight: 1.3,
          userSelect: "none"
        }}>{t("screens.sign_in.meet")}</span>
          <span style={{
          display: "block",
          fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "3px",
          textTransform: "uppercase",
          background: "linear-gradient(92deg, hsl(var(--brand-purple-500)) 0%, hsl(var(--brand-pink-500)) 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
          lineHeight: 1.05,
          userSelect: "none",
          animation: "siAmyGlow 3.2s 0.5s ease-in-out infinite"
        }}>{t("pages.sign_in.amy")}</span>
        </div>
      </div>
    </div>;
}

// ── Full-page shell ────────────────────────────────────────────────────────────
function AuthShell({
  children
}: {
  children: React.ReactNode;
}) {
  const {
    t
  } = useTranslation();
  const nativeShell = isNativeAmyNestShell();
  const { kavRef, scrollRef, keyboardOpen, handleBackgroundTap } =
    useNativeAuthKeyboard(nativeShell);
  return (
    <AuthKeyboardShell
      kavRef={nativeShell ? kavRef : undefined}
      scrollRef={nativeShell ? scrollRef : undefined}
      keyboardOpen={keyboardOpen}
      onBackgroundTap={nativeShell ? handleBackgroundTap : undefined}
      className="amynest-auth-page"
      style={{
        minHeight: nativeShell ? undefined : "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: nativeShell ? "flex-start" : "center",
        padding: nativeShell ? NATIVE_AUTH_SHELL_PADDING : AUTH_SPACING.shellPaddingWeb,
        background: [
          "radial-gradient(circle at 50% 42%, rgba(100,40,200,0.20) 0%, transparent 58%)",
          "linear-gradient(175deg, #0a061a 0%, #120a2e 55%, #050010 100%)",
        ].join(", "),
        position: "relative",
        overflowX: "hidden",
        overflowY: nativeShell ? undefined : "hidden",
        WebkitOverflowScrolling: nativeShell ? "touch" : undefined,
      }}
    >
      {/* Inject keyframes + hover classes */}
      <style>{SIGN_IN_CSS}</style>

      {/* Concentric wave rings */}
      <div style={{
      position: "absolute",
      top: "50%",
      left: "50%",
      width: 0,
      height: 0,
      borderRadius: "50%",
      boxShadow: ["0 0 0  80px rgba(168,85,247,0.04)", "0 0 0 170px rgba(168,85,247,0.03)", "0 0 0 290px rgba(100,50,200,0.02)", "0 0 0 440px rgba(80,30,160,0.015)"].join(", "),
      animation: "siWavePulse 8s ease-in-out infinite",
      pointerEvents: "none"
    }} />

      <div style={{
      width: "100%",
      maxWidth: "420px",
      position: "relative",
      zIndex: 1
    }}>

        {/* Neon ring hero — hidden on native while keyboard is open */}
        <div className={`amynest-auth-hero${nativeShell ? "" : " amynest-auth-hero--web"}`}>
        <NeonRingHero />
        <div style={{
        width: AUTH_SPACING.heroGlowWidth,
        height: AUTH_SPACING.heroGlowHeight,
        margin: "-2px auto 0",
        background: "radial-gradient(ellipse at center, rgba(168,85,247,0.55) 0%, rgba(236,72,153,0.30) 45%, transparent 70%)",
        filter: "blur(12px)",
        pointerEvents: "none"
      }} />
        </div>

        {/* Card */}
        <div className="amynest-auth-card" style={{
        ...authCardStyle(),
        marginTop: AUTH_SPACING.cardMarginTop
      }}>
          <div style={{
          padding: AUTH_SPACING.cardPadding
        }}>
            {children}
          </div>
        </div>

        <p className="amynest-auth-tagline" style={{
        marginTop: AUTH_SPACING.taglineMarginTop,
        textAlign: "center",
        fontSize: "11px",
        color: "rgba(255,255,255,0.22)"
      }}>
          {t("screens.sign_in.tagline")}
        </p>
      </div>
    </AuthKeyboardShell>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
type ViewMode = "signin" | "reset" | "reset-sent";
export default function SignInPage() {
  const {
    t
  } = useTranslation();
  const [, setLocation] = useLocation();
  const {
    isLoaded,
    isSignedIn
  } = useAuth();
  const [mode, setMode] = useState<ViewMode>("signin");
  const demoLoginEmail =
    import.meta.env.VITE_AMYNEST_ENV !== "production"
      ? (import.meta.env.VITE_DEMO_LOGIN_EMAIL as string | undefined)?.trim() ?? ""
      : "";
  const demoLoginPassword =
    import.meta.env.VITE_AMYNEST_ENV !== "production"
      ? (import.meta.env.VITE_DEMO_LOGIN_PASSWORD as string | undefined) ?? ""
      : "";
  const [email, setEmail] = useState(demoLoginEmail);
  const [password, setPassword] = useState(demoLoginPassword);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    void shouldShowPermissionsSetupPromptAsync().then((show) => {
      if (cancelled) return;
      setLocation(show ? "/notify-prompt?next=/" : "/");
    });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, setLocation]);
  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const cred = await withAuthTimeout(
        signInWithEmailAndPassword(firebaseAuth, email.trim(), password),
        "signInWithEmailAndPassword",
      );
      const user = await syncUserEmailVerificationFromServer(cred.user);
      const loginEmail = (user.email ?? email.trim()).toLowerCase().trim();
      const isBypass = isEmailVerificationBypassEmail(loginEmail);
      if (!user.emailVerified && !isBypass) {
        // Send verification email on sign-in (verify page only resends if user taps).
        let verifySendFailed = false;
        try {
          await sendUserEmailVerification(user);
        } catch (verifyErr: unknown) {
          logFirebaseAuthError("sign-in:sendEmailVerification", verifyErr);
          stashVerificationSendError(verifyErr);
          verifySendFailed = true;
        }
        const q = new URLSearchParams({ email: email.trim() });
        if (!verifySendFailed) q.set("sent", "1");
        else q.set("sendFailed", "1");
        setLocation(`/verify-email?${q.toString()}`);
        return;
      }
      if (isBypass) {
        try {
          await user.getIdToken(true);
        } catch {
          /* non-fatal — auth listener will still pick up the session */
        }
      }
      await ensureAuthContextSynced();
      void import("@/lib/meta-attribution").then(({ trackMetaLogin }) => {
        trackMetaLogin("email");
      });
      const showPerms = await shouldShowPermissionsSetupPromptAsync();
      let dest = showPerms ? "/notify-prompt?next=/" : "/";
      if (!showPerms) {
        try {
          dest = await Promise.race([
            resolvePostOAuthDestination(),
            new Promise<string>((resolve) => {
              window.setTimeout(() => resolve("/dashboard"), 4_000);
            }),
          ]);
        } catch {
          dest = "/dashboard";
        }
      }
      if (isNativeAmyNestShell()) {
        navigateAfterAuth(dest);
        return;
      }
      setLocation(dest);
    } catch (err: any) {
      setError(prettyAuthError(err));
    } finally {
      setBusy(false);
    }
  };
  const onForgotOpen = () => {
    setResetEmail(email);
    setResetError(null);
    setMode("reset");
  };
  const onSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetBusy(true);
    try {
      const checkRes = await fetch(getApiUrl("/api/auth/check-reset-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const checkData = (await parseApiJson<{ exists?: boolean }>(checkRes));
      if (!checkData.exists) {
        setResetError(t("screens.sign_in.reset_not_found"));
        return;
      }
      await sendUserPasswordResetEmail(resetEmail.trim());
      setMode("reset-sent");
    } catch (err: any) {
      setResetError(prettyAuthError(err));
    } finally {
      setResetBusy(false);
    }
  };

  // ── Reset-sent confirmation ──────────────────────────────────────────────
  if (mode === "reset-sent") {
    return <AuthShell>
        <div style={{
        fontSize: "40px",
        marginBottom: "12px"
      }}>📬</div>
        <h1 style={{
        margin: "0 0 8px",
        fontSize: "22px",
        fontWeight: 800,
        color: "#FFFFFF"
      }}>
          {t("screens.sign_in.inbox_title")}
        </h1>
        <p style={{
        margin: "0 0 24px",
        fontSize: "14px",
        color: "rgba(200,180,255,0.70)",
        lineHeight: 1.5
      }}>
          {t("screens.sign_in.inbox_body_before")}{" "}
          <span style={{
          color: "hsl(var(--brand-purple-400))",
          fontWeight: 600
        }}>{resetEmail}</span>
          {t("screens.sign_in.inbox_body_after")}
        </p>
        <button type="button" onClick={() => setMode("signin")} className="si-submit-btn" style={{
        ...AUTH_SUBMIT_BTN_STYLE,
        background: "linear-gradient(90deg, hsl(var(--brand-purple-500)) 0%, hsl(var(--brand-pink-500)) 100%)",
        border: "none",
        color: "#FFFFFF",
        cursor: "pointer",
        boxShadow: "0 0 28px rgba(236,72,153,0.50), 0 4px 18px rgba(0,0,0,0.30)",
      }}>
          {t("screens.sign_in.back_to_sign_in_button")}
        </button>
      </AuthShell>;
  }

  // ── Forgot-password form ─────────────────────────────────────────────────
  if (mode === "reset") {
    return <AuthShell>
        <h1 style={{
        margin: "0 0 6px",
        fontSize: "24px",
        fontWeight: 800,
        color: "#FFFFFF"
      }}>
          {t("screens.sign_in.reset_title")}
        </h1>
        <p style={{
        margin: "0 0 24px",
        fontSize: "14px",
        color: "rgba(200,180,255,0.65)"
      }}>
          {t("screens.sign_in.reset_subtitle")}
        </p>

        <form onSubmit={onSendReset} style={{
        display: "flex",
        flexDirection: "column",
        gap: `${AUTH_SPACING.formGap}px`,
        textAlign: "left"
      }}>
          <div>
            <label style={{
            display: "block",
            fontSize: "12px",
            fontWeight: 600,
            color: "rgba(200,180,255,0.80)",
            marginBottom: `${AUTH_SPACING.labelMarginBottom}px`
          }}>
              {t("screens.sign_in.email_label")}
            </label>
            <input type="email" required className={AUTH_INPUT_CLASS} value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder={t("screens.sign_in.email_placeholder")} style={{
            ...INPUT_STYLE
          }} onFocus={glowFocus} onBlur={glowBlur} autoFocus />
          </div>

          {resetError && <ErrorBanner>{resetError}</ErrorBanner>}

          <button type="submit" disabled={resetBusy} className="si-submit-btn" style={{
          ...AUTH_SUBMIT_BTN_STYLE,
          background: resetBusy ? "rgba(75,65,110,0.7)" : "linear-gradient(90deg, hsl(var(--brand-purple-500)) 0%, hsl(var(--brand-pink-500)) 100%)",
          border: "none",
          color: "#FFFFFF",
          cursor: resetBusy ? "not-allowed" : "pointer",
          boxShadow: resetBusy ? "none" : "0 0 28px rgba(236,72,153,0.50), 0 4px 18px rgba(0,0,0,0.30)",
          marginTop: "2px"
        }}>
            {resetBusy ? t("screens.sign_in.sending") : t("screens.sign_in.send_reset")}
          </button>
        </form>

        <button type="button" onClick={() => setMode("signin")} style={{
        marginTop: "16px",
        background: "none",
        border: "none",
        color: "rgba(200,180,255,0.50)",
        fontSize: "14px",
        cursor: "pointer",
        fontFamily: "inherit",
        width: "100%"
      }}>
          {t("screens.sign_in.back_to_sign_in_link")}
        </button>
      </AuthShell>;
  }

  // ── Main sign-in view ────────────────────────────────────────────────────
  return <AuthShell>
      <h1 style={{
      margin: "0 0 4px",
      fontSize: `${AUTH_SPACING.titleSize}px`,
      fontWeight: 800,
      color: "#FFFFFF",
      letterSpacing: "-0.4px"
    }}>
        {t("screens.sign_in.title")}
      </h1>
      <p style={{
      margin: `0 0 ${AUTH_SPACING.subtitleMarginBottom}px`,
      fontSize: "14px",
      color: "rgba(200,180,255,0.65)"
    }}>
        {t("screens.sign_in.subtitle")}
      </p>

      {shouldShowAppleSignIn() ? (
        <div
          data-testid="native-apple-sign-in-slot"
          style={{ marginBottom: 10, width: "100%", flexShrink: 0 }}
        >
          <SignInAppleButton onError={msg => setError(msg)} />
        </div>
      ) : null}

      <div
        className="si-oauth-stack"
        style={
          isCapacitorIosShell()
            ? {
                marginBottom: 4,
                flexShrink: 0,
                minHeight: 50,
              }
            : undefined
        }
      >
        {shouldShowGoogleSignIn() ? (
          <GoogleSignInButton onError={msg => setError(msg)} />
        ) : null}

        {shouldShowFacebookSignIn() ? (
          <FacebookSignInButton onError={msg => setError(msg)} />
        ) : null}

        {shouldShowPhoneOtp() ? (
          <div className="si-phone-wrapper">
            <PhoneRecaptchaPreload />
            <PhoneAuthFlow onError={msg => setError(msg)} />
          </div>
        ) : null}
      </div>

      {(shouldShowGoogleSignIn() || shouldShowFacebookSignIn() || shouldShowAppleSignIn() || shouldShowPhoneOtp()) && (
      <div style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      margin: AUTH_SPACING.dividerMargin
    }}>
        <div style={{
        flex: 1,
        height: "1px",
        background: "rgba(168,85,247,0.15)"
      }} />
        <span style={{
        fontSize: "12px",
        color: "rgba(255,255,255,0.30)"
      }}>{t("screens.sign_in.divider_or")}</span>
        <div style={{
        flex: 1,
        height: "1px",
        background: "rgba(168,85,247,0.15)"
      }} />
      </div>
      )}


      {/* Email + password */}
      <form onSubmit={onEmail} style={{
      display: "flex",
      flexDirection: "column",
      gap: `${AUTH_SPACING.formGap}px`,
      textAlign: "left"
    }}>
        <div>
          <label style={{
          display: "block",
          fontSize: "12px",
          fontWeight: 600,
          color: "rgba(200,180,255,0.80)",
          marginBottom: `${AUTH_SPACING.labelMarginBottom}px`
        }}>
            {t("screens.sign_in.email_label")}
          </label>
          <input type="email" required className={AUTH_INPUT_CLASS} value={email} onChange={e => setEmail(e.target.value)} placeholder={t("screens.sign_in.email_placeholder")} style={{
          ...INPUT_STYLE
        }} onFocus={glowFocus} onBlur={glowBlur} />
        </div>

        <div>
          <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: `${AUTH_SPACING.labelMarginBottom}px`
        }}>
            <label style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "rgba(200,180,255,0.80)"
          }}>{t("screens.sign_in.password_label")}</label>
            <button type="button" onClick={onForgotOpen} style={{
            background: "none",
            border: "none",
            padding: 0,
            fontSize: "12px",
            color: "hsl(var(--brand-purple-500))",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit"
          }}>
              {t("screens.sign_in.forgot")}
            </button>
          </div>
          <div style={{
          position: "relative"
        }}>
            <input type={showPass ? "text" : "password"} required className={AUTH_INPUT_CLASS} minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder={t("screens.sign_in.password_placeholder")} style={{
            ...INPUT_STYLE,
            paddingRight: "44px"
          }} onFocus={glowFocus} onBlur={glowBlur} />
            <button type="button" onClick={() => setShowPass(s => !s)} style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(200,180,255,0.50)",
            fontSize: "13px",
            padding: 0
          }}>
              {showPass ? t("screens.sign_in.hide") : t("screens.sign_in.show")}
            </button>
          </div>
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <button type="submit" disabled={busy} className="si-submit-btn" style={{
        ...AUTH_SUBMIT_BTN_STYLE,
        background: busy ? "rgba(75,65,110,0.7)" : "linear-gradient(90deg, hsl(var(--brand-purple-500)) 0%, hsl(var(--brand-pink-500)) 100%)",
        border: "none",
        color: "#FFFFFF",
        cursor: busy ? "not-allowed" : "pointer",
        boxShadow: busy ? "none" : "0 0 28px rgba(236,72,153,0.50), 0 4px 18px rgba(0,0,0,0.30)",
        marginTop: "2px"
      }}>
          {busy ? t("screens.sign_in.signing_in") : t("screens.sign_in.sign_in_button")}
        </button>
      </form>

      <p className="amynest-auth-footer" style={{
      marginTop: `${AUTH_SPACING.footerMarginTop}px`,
      fontSize: "14px",
      color: "rgba(200,180,255,0.50)",
      textAlign: "center"
    }}>
        {t("screens.sign_in.no_account")}{" "}
        <Link href="/sign-up" style={{
        color: "hsl(var(--brand-purple-500))",
        fontWeight: 600,
        textDecoration: "none"
      }}>
          {t("screens.sign_in.sign_up_link")}
        </Link>
      </p>
      <AuthLegalFooter />
    </AuthShell>;
}

// ── Shared error banner ────────────────────────────────────────────────────────
function ErrorBanner({
  children
}: {
  children: React.ReactNode;
}) {
  return <div style={{
    fontSize: "13px",
    color: "hsl(var(--brand-red-400))",
    background: "rgba(255,60,60,0.10)",
    border: "1px solid rgba(255,60,60,0.22)",
    borderRadius: "10px",
    padding: "8px 12px"
  }}>
      {children}
    </div>;
}