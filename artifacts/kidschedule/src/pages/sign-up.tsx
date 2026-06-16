import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { isEmailVerificationBypassEmail } from "@/lib/email-verification-bypass";
import { sendUserEmailVerification } from "@/lib/email-verification";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { prettyAuthError, stashVerificationSendError, logFirebaseAuthError } from "@/lib/auth-errors";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { FacebookSignInButton } from "@/components/facebook-sign-in-button";
import { AppleSignInButton } from "@/components/apple-sign-in-button";
import { AuthLegalFooter } from "@/components/auth-legal-footer";
import PhoneAuthFlow from "@/components/phone-auth-flow";
import { PhoneRecaptchaPreload } from "@/components/phone-recaptcha-preload";
import {
  shouldShowAppleSignIn,
  shouldShowGoogleSignIn,
  shouldShowFacebookSignIn,
  shouldShowPhoneOtp,
} from "@/lib/auth-feature-flags";
import { navigateAfterAuth } from "@/lib/auth-navigation";
import { ensureAuthContextSynced } from "@/lib/auth-session-sync";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import { onPreSignupSignupStarted } from "@/lib/pre-signup-reengagement/orchestrator";
import { markPreSignupSignupFlowActive } from "@/lib/pre-signup-reengagement/storage";
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
  authCardStyle,
  authHeroRingSize,
  authInputGlowBlur,
  authInputGlowFocus,
} from "@/lib/auth-screen-layout";

// ── Animation keyframes (same classes as sign-in — CSS idempotent in SPA) ────
const SIGN_UP_CSS = `
  @keyframes suRingRotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes suRingPulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.03); }
  }
  @keyframes suShimmerOrbit {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes suGlowBreathe {
    0%, 100% { transform: translate(-50%,-50%) scale(1);   opacity: 1; }
    50%      { transform: translate(-50%,-50%) scale(1.1); opacity: 0.72; }
  }
  @keyframes suAmyGlow {
    0%, 100% { filter: drop-shadow(0 0 8px rgba(236,72,153,0.50)); }
    50%      { filter: drop-shadow(0 0 18px rgba(236,72,153,0.82)) drop-shadow(0 0 32px rgba(168,85,247,0.42)); }
  }
  @keyframes suFlicker {
    0%, 100% { opacity: 1;   box-shadow: 0 0 8px rgba(255,255,255,0.9), 0 0 18px rgba(168,85,247,0.8); }
    48%      { opacity: 0.55; box-shadow: 0 0 4px rgba(255,255,255,0.5), 0 0 8px rgba(168,85,247,0.4); }
    52%      { opacity: 0.9; }
  }
  @keyframes suWavePulse {
    0%, 100% { transform: translate(-50%,-50%) scale(1);    opacity: 1; }
    50%      { transform: translate(-50%,-50%) scale(1.05); opacity: 0.7; }
  }
  .su-phone-btn:hover {
    background: rgba(168,85,247,0.18) !important;
    box-shadow: 0 0 0 1px rgba(168,85,247,0.70), 0 0 22px rgba(168,85,247,0.45) !important;
  }
  .su-oauth-stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    z-index: 2;
  }
  .su-submit-btn {
    transition: transform 0.18s ease, box-shadow 0.18s ease !important;
  }
  .su-submit-btn:hover:not(:disabled) {
    transform: scale(1.025) !important;
    box-shadow: 0 0 42px rgba(236,72,153,0.65), 0 6px 22px rgba(0,0,0,0.38) !important;
  }
`;

// ── Input focus / blur ────────────────────────────────────────────────────────
const glowFocus = authInputGlowFocus;
const glowBlur = authInputGlowBlur;
const INPUT_STYLE = AUTH_INPUT_STYLE;

// ── Neon ring hero — 140 px, "Meet" + "AMY" inside glass ─────────────────────
function NeonRingHero() {
  const {
    t
  } = useTranslation();
  const R = authHeroRingSize();
  const INNER = Math.round(R * 0.8);
  const OFF = (R - INNER) / 2;
  const MASK_IN = R / 2 - 6;
  const MASK_OUT = R / 2 - 2;
  return <div style={{
    position: "relative",
    width: R,
    height: R,
    margin: "0 auto",
    zIndex: 2
  }}>

      {/* Atmospheric glow */}
      <div style={{
      position: "absolute",
      top: "50%",
      left: "50%",
      width: 200,
      height: 200,
      transform: "translate(-50%, -50%)",
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(168,85,247,0.28) 0%, rgba(236,72,153,0.18) 45%, transparent 70%)",
      filter: "blur(24px)",
      animation: "suGlowBreathe 3.5s ease-in-out infinite",
      pointerEvents: "none"
    }} />

      {/* Secondary orbit line */}
      <div style={{
      position: "absolute",
      top: -14,
      left: -14,
      width: R + 28,
      height: R + 28,
      borderRadius: "50%",
      border: "1px solid rgba(168,85,247,0.15)",
      pointerEvents: "none"
    }} />

      {/* Pulse wrapper */}
      <div style={{
      position: "absolute",
      inset: 0,
      animation: "suRingPulse 2.8s ease-in-out infinite"
    }}>

        {/* Layer 1: conic-gradient ring */}
        <div style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        background: "conic-gradient(from 0deg, hsl(var(--brand-purple-500)) 0deg, hsl(var(--brand-pink-500)) 90deg, hsl(var(--brand-purple-500)) 180deg, hsl(var(--brand-pink-500)) 270deg, hsl(var(--brand-purple-500)) 360deg)",
        WebkitMaskImage: `radial-gradient(circle, transparent ${MASK_IN}px, black ${MASK_OUT}px)`,
        maskImage: `radial-gradient(circle, transparent ${MASK_IN}px, black ${MASK_OUT}px)`,
        animation: "suRingRotate 10s linear infinite",
        willChange: "transform"
      }} />

        {/* Layer 2: shimmer arc */}
        <div style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        background: "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0) 5deg, rgba(255,255,255,0.80) 13deg, rgba(255,255,255,0) 21deg, transparent 21deg)",
        WebkitMaskImage: `radial-gradient(circle, transparent ${MASK_IN}px, black ${MASK_OUT}px)`,
        maskImage: `radial-gradient(circle, transparent ${MASK_IN}px, black ${MASK_OUT}px)`,
        animation: "suShimmerOrbit 3.5s linear infinite",
        willChange: "transform"
      }} />

        {/* Layer 4: flare dot */}
        <div style={{
        position: "absolute",
        width: 7,
        height: 7,
        top: 8,
        right: 18,
        borderRadius: "50%",
        background: "white",
        boxShadow: "0 0 7px rgba(255,255,255,0.9), 0 0 16px rgba(168,85,247,0.8), 0 0 22px rgba(236,72,153,0.6)",
        animation: "suFlicker 2.4s ease-in-out infinite"
      }} />

        {/* Layer 3: inner glass circle */}
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
          fontSize: 10,
          fontWeight: 300,
          letterSpacing: "3px",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.78)",
          lineHeight: 1.3,
          userSelect: "none"
        }}>{t("screens.sign_up.meet")}</span>
          <span style={{
          display: "block",
          fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: "2.5px",
          textTransform: "uppercase",
          background: "linear-gradient(92deg, hsl(var(--brand-purple-500)) 0%, hsl(var(--brand-pink-500)) 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
          lineHeight: 1.05,
          userSelect: "none",
          animation: "suAmyGlow 3.2s 0.5s ease-in-out infinite"
        }}>{t("pages.sign_up.amy")}</span>
        </div>
      </div>
    </div>;
}

// ── Full-page shell ───────────────────────────────────────────────────────────
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
      <style>{SIGN_UP_CSS}</style>

      {/* Concentric wave rings */}
      <div style={{
      position: "absolute",
      top: "50%",
      left: "50%",
      width: 0,
      height: 0,
      borderRadius: "50%",
      boxShadow: ["0 0 0  80px rgba(168,85,247,0.04)", "0 0 0 170px rgba(168,85,247,0.03)", "0 0 0 290px rgba(100,50,200,0.02)", "0 0 0 440px rgba(80,30,160,0.015)"].join(", "),
      animation: "suWavePulse 8s ease-in-out infinite",
      pointerEvents: "none"
    }} />

      <div style={{
      width: "100%",
      maxWidth: "420px",
      position: "relative",
      zIndex: 1
    }}>

        <div className="amynest-auth-hero">
        <NeonRingHero />
        <div style={{
        width: AUTH_SPACING.heroGlowWidth,
        height: AUTH_SPACING.heroGlowHeight,
        margin: "-2px auto 0",
        background: "radial-gradient(ellipse at center, rgba(168,85,247,0.50) 0%, rgba(236,72,153,0.28) 45%, transparent 70%)",
        filter: "blur(10px)",
        pointerEvents: "none"
      }} />
        </div>

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
          {t("screens.sign_up.tagline")}
        </p>
      </div>
    </AuthKeyboardShell>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SignUpPage() {
  const {
    t
  } = useTranslation();
  const [, setLocation] = useLocation();
  const {
    isLoaded,
    isSignedIn
  } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (isLoaded && isSignedIn) setLocation("/");
  }, [isLoaded, isSignedIn, setLocation]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("amynest_pre_signup_started") === "1") return;
      sessionStorage.setItem("amynest_pre_signup_started", "1");
    } catch {
      /* ignore */
    }
    markPreSignupSignupFlowActive();
    onPreSignupSignupStarted();
  }, []);

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const cred = await withAuthTimeout(
        createUserWithEmailAndPassword(firebaseAuth, email.trim(), password),
        "createUserWithEmailAndPassword",
      );
      if (name.trim()) {
        try {
          await updateProfile(cred.user, { displayName: name.trim() });
        } catch {
          /* non-fatal */
        }
      }
      const signupEmail = (cred.user.email ?? email.trim()).toLowerCase().trim();
      if (isEmailVerificationBypassEmail(signupEmail)) {
        try {
          await cred.user.getIdToken(true);
        } catch {
          /* non-fatal */
        }
        if (isNativeAmyNestShell()) {
          await ensureAuthContextSynced();
          navigateAfterAuth("/");
          return;
        }
        setLocation("/");
        return;
      }
      let verifySendFailed = false;
      try {
        await sendUserEmailVerification(cred.user);
      } catch (verifyErr: unknown) {
        logFirebaseAuthError("sign-up:sendEmailVerification", verifyErr);
        stashVerificationSendError(verifyErr);
        verifySendFailed = true;
      }
      const q = new URLSearchParams({ email: email.trim() });
      if (verifySendFailed) q.set("sendFailed", "1");
      else q.set("sent", "1");
      setLocation(`/verify-email?${q.toString()}`);
    } catch (err: any) {
      setError(prettyAuthError(err));
    } finally {
      setBusy(false);
    }
  };
  const canSubmit = email.trim() && password.length >= 6;
  return <AuthShell>
      <h1 style={{
      margin: "0 0 4px",
      fontSize: `${AUTH_SPACING.titleSize}px`,
      fontWeight: 800,
      color: "#FFFFFF",
      letterSpacing: "-0.4px"
    }}>
        {t("screens.sign_up.title")}
      </h1>
      <p style={{
      margin: `0 0 ${AUTH_SPACING.subtitleMarginBottom}px`,
      fontSize: "14px",
      color: "rgba(200,180,255,0.65)"
    }}>
        {t("screens.sign_up.subtitle")}
      </p>

      <div className="su-oauth-stack">
      {shouldShowAppleSignIn() ? (
        <AppleSignInButton onError={msg => setError(msg)} />
      ) : null}

      {shouldShowGoogleSignIn() ? (
        <GoogleSignInButton onError={msg => setError(msg)} />
      ) : null}

      {shouldShowFacebookSignIn() ? (
        <FacebookSignInButton onError={msg => setError(msg)} />
      ) : null}

      {shouldShowPhoneOtp() ? (
        <div className="su-phone-wrapper">
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
      }}>{t("screens.sign_up.divider_or")}</span>
        <div style={{
        flex: 1,
        height: "1px",
        background: "rgba(168,85,247,0.15)"
      }} />
      </div>
      )}

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
            {t("screens.sign_up.name_label")}
          </label>
          <input type="text" className={AUTH_INPUT_CLASS} value={name} onChange={e => setName(e.target.value)} placeholder={t("screens.sign_up.name_placeholder")} style={INPUT_STYLE} onFocus={glowFocus} onBlur={glowBlur} />
        </div>

        <div>
          <label style={{
          display: "block",
          fontSize: "12px",
          fontWeight: 600,
          color: "rgba(200,180,255,0.80)",
          marginBottom: `${AUTH_SPACING.labelMarginBottom}px`
        }}>
            {t("screens.sign_up.email_label")}
          </label>
          <input type="email" required className={AUTH_INPUT_CLASS} value={email} onChange={e => setEmail(e.target.value)} placeholder={t("screens.sign_up.email_placeholder")} style={INPUT_STYLE} onFocus={glowFocus} onBlur={glowBlur} />
        </div>

        <div>
          <label style={{
          display: "block",
          fontSize: "12px",
          fontWeight: 600,
          color: "rgba(200,180,255,0.80)",
          marginBottom: `${AUTH_SPACING.labelMarginBottom}px`
        }}>
            {t("screens.sign_up.password_label")}
          </label>
          <div style={{
          position: "relative"
        }}>
            <input type={showPass ? "text" : "password"} required className={AUTH_INPUT_CLASS} minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder={t("screens.sign_up.password_placeholder")} style={{
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
              {showPass ? t("screens.sign_up.hide") : t("screens.sign_up.show")}
            </button>
          </div>
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <button type="submit" disabled={busy || !canSubmit} className="su-submit-btn" style={{
        ...AUTH_SUBMIT_BTN_STYLE,
        background: busy || !canSubmit ? "rgba(75,65,110,0.7)" : "linear-gradient(90deg, hsl(var(--brand-purple-500)) 0%, hsl(var(--brand-pink-500)) 100%)",
        border: "none",
        color: "#FFFFFF",
        cursor: busy || !canSubmit ? "not-allowed" : "pointer",
        boxShadow: busy || !canSubmit ? "none" : "0 0 28px rgba(236,72,153,0.50), 0 4px 18px rgba(0,0,0,0.30)",
        marginTop: "2px"
      }}>
          {busy ? t("screens.sign_up.creating") : t("screens.sign_up.create_button")}
        </button>
      </form>

      <p className="amynest-auth-footer" style={{
      marginTop: `${AUTH_SPACING.footerMarginTop}px`,
      fontSize: "14px",
      color: "rgba(200,180,255,0.50)",
      textAlign: "center"
    }}>
        {t("screens.sign_up.have_account")}{" "}
        <Link href="/sign-in" style={{
        color: "hsl(var(--brand-purple-500))",
        fontWeight: 600,
        textDecoration: "none"
      }}>
          {t("screens.sign_up.sign_in_link")}
        </Link>
      </p>
      <AuthLegalFooter />
    </AuthShell>;
}