import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { prettyAuthError } from "@/lib/auth-errors";
import PhoneAuthFlow from "@/components/phone-auth-flow";

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
  .si-submit-btn {
    transition: transform 0.18s ease, box-shadow 0.18s ease !important;
  }
  .si-submit-btn:hover:not(:disabled) {
    transform: scale(1.025) !important;
    box-shadow: 0 0 42px rgba(236,72,153,0.65), 0 6px 22px rgba(0,0,0,0.38) !important;
  }
`;

// ── Input focus / blur handlers ───────────────────────────────────────────────
function glowFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "rgba(168,85,247,0.75)";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.18), 0 0 14px rgba(168,85,247,0.22)";
}
function glowBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "rgba(168,85,247,0.25)";
  e.currentTarget.style.boxShadow = "none";
}

// ── Shared style constants ────────────────────────────────────────────────────
const INPUT_STYLE: React.CSSProperties = {
  width: "100%", height: "48px", padding: "0 16px",
  borderRadius: "14px", outline: "none", fontSize: "15px",
  background: "rgba(10,6,26,0.72)",
  border: "1px solid rgba(168,85,247,0.25)",
  color: "#F0E8FF",
  fontFamily: "inherit",
  boxSizing: "border-box",
  transition: "border-color 0.18s, box-shadow 0.18s",
};

const CARD: React.CSSProperties = {
  background: "rgba(12,6,30,0.78)",
  backdropFilter: "blur(28px)",
  WebkitBackdropFilter: "blur(28px)",
  borderRadius: "28px",
  border: "1px solid rgba(168,85,247,0.28)",
  boxShadow: [
    "0 0 0 1px rgba(255,255,255,0.04) inset",
    "0 0 60px rgba(168,85,247,0.12)",
    "0 32px 80px rgba(0,0,0,0.62)",
  ].join(", "),
};

// ── Neon ring hero (sits above the card) ─────────────────────────────────────
function NeonRingHero() {
  const R = 170;                         // outer ring diameter
  const INNER = 136;                     // inner glass diameter
  const OFF = (R - INNER) / 2;          // offset to centre inner inside ring
  const MASK_IN = R / 2 - 7;            // transparent up to here (px)
  const MASK_OUT = R / 2 - 3;           // ring starts here

  return (
    <div style={{ position: "relative", width: R, height: R, margin: "0 auto", zIndex: 2 }}>

      {/* Atmospheric outer glow — bleeds outside ring */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: 250, height: 250,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(168,85,247,0.28) 0%, rgba(236,72,153,0.18) 45%, transparent 70%)",
        filter: "blur(28px)",
        animation: "siGlowBreathe 3.5s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* Secondary faint orbit line */}
      <div style={{
        position: "absolute",
        top: -17, left: -17,
        width: R + 34, height: R + 34,
        borderRadius: "50%",
        border: "1px solid rgba(168,85,247,0.16)",
        pointerEvents: "none",
      }} />

      {/* Pulse wrapper — scale 1 ↔ 1.04, wraps ring + shimmer + inner */}
      <div style={{ position: "absolute", inset: 0, animation: "siRingPulse 2.8s ease-in-out infinite" }}>

        {/* Layer 1: conic-gradient ring */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "conic-gradient(from 0deg, #a855f7 0deg, #ec4899 90deg, #a855f7 180deg, #ec4899 270deg, #a855f7 360deg)",
          WebkitMaskImage: `radial-gradient(circle, transparent ${MASK_IN}px, black ${MASK_OUT}px)`,
          maskImage: `radial-gradient(circle, transparent ${MASK_IN}px, black ${MASK_OUT}px)`,
          animation: "siRingRotate 11s linear infinite",
          willChange: "transform",
        }} />

        {/* Layer 2: shimmer arc — bright ~16° streak orbiting at 3.5s */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0) 5deg, rgba(255,255,255,0.85) 13deg, rgba(255,255,255,0) 21deg, transparent 21deg)",
          WebkitMaskImage: `radial-gradient(circle, transparent ${MASK_IN}px, black ${MASK_OUT}px)`,
          maskImage: `radial-gradient(circle, transparent ${MASK_IN}px, black ${MASK_OUT}px)`,
          animation: "siShimmerOrbit 3.5s linear infinite",
          willChange: "transform",
        }} />

        {/* Layer 4: light flare on ring edge (top-right position) */}
        <div style={{
          position: "absolute",
          width: 8, height: 8,
          top: 10, right: 22,
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 0 8px rgba(255,255,255,0.9), 0 0 18px rgba(168,85,247,0.8), 0 0 26px rgba(236,72,153,0.6)",
          animation: "siFlicker 2.4s ease-in-out infinite",
        }} />

        {/* Layer 3: inner glass circle — dark centre with depth */}
        <div style={{
          position: "absolute",
          top: OFF, left: OFF,
          width: INNER, height: INNER,
          borderRadius: "50%",
          background: "radial-gradient(circle at 38% 36%, rgba(26,8,58,0.86) 0%, rgba(8,4,22,0.92) 60%, rgba(3,0,12,0.96) 100%)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          zIndex: 2,
        }}>
          <span style={{
            display: "block",
            fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
            fontSize: 12, fontWeight: 300, letterSpacing: "4px",
            textTransform: "uppercase", color: "rgba(255,255,255,0.80)",
            lineHeight: 1.3, userSelect: "none",
          }}>Meet</span>
          <span style={{
            display: "block",
            fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
            fontSize: 32, fontWeight: 700, letterSpacing: "4px",
            textTransform: "uppercase",
            background: "linear-gradient(92deg, #a855f7 0%, #ec4899 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text",
            color: "transparent", WebkitTextFillColor: "transparent",
            lineHeight: 1.05, userSelect: "none",
            animation: "siAmyGlow 3.2s 0.5s ease-in-out infinite",
          }}>AMY</span>
        </div>
      </div>
    </div>
  );
}

// ── Full-page shell ────────────────────────────────────────────────────────────
function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 16px",
      background: [
        "radial-gradient(circle at 50% 42%, rgba(100,40,200,0.20) 0%, transparent 58%)",
        "linear-gradient(175deg, #0a061a 0%, #120a2e 55%, #050010 100%)",
      ].join(", "),
      position: "relative", overflow: "hidden",
    }}>
      {/* Inject keyframes + hover classes */}
      <style>{SIGN_IN_CSS}</style>

      {/* Concentric wave rings */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: 0, height: 0, borderRadius: "50%",
        boxShadow: [
          "0 0 0  80px rgba(168,85,247,0.04)",
          "0 0 0 170px rgba(168,85,247,0.03)",
          "0 0 0 290px rgba(100,50,200,0.02)",
          "0 0 0 440px rgba(80,30,160,0.015)",
        ].join(", "),
        animation: "siWavePulse 8s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>

        {/* Neon ring hero */}
        <NeonRingHero />

        {/* Floating platform glow under ring */}
        <div style={{
          width: 130, height: 22,
          margin: "-4px auto 0",
          background: "radial-gradient(ellipse at center, rgba(168,85,247,0.55) 0%, rgba(236,72,153,0.30) 45%, transparent 70%)",
          filter: "blur(12px)",
          pointerEvents: "none",
        }} />

        {/* Card */}
        <div style={{ ...CARD, marginTop: "8px" }}>
          <div style={{ padding: "28px 32px 28px" }}>
            {children}
          </div>
        </div>

        <p style={{ marginTop: "20px", textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.22)" }}>
          Where Smart Parenting Begins
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
type ViewMode = "signin" | "reset" | "reset-sent";

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const [mode, setMode] = useState<ViewMode>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) setLocation("/");
  }, [isLoaded, isSignedIn, setLocation]);

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      setLocation("/");
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
      await sendPasswordResetEmail(firebaseAuth, resetEmail.trim());
      setMode("reset-sent");
    } catch (err: any) {
      setResetError(prettyAuthError(err));
    } finally {
      setResetBusy(false);
    }
  };

  // ── Reset-sent confirmation ──────────────────────────────────────────────
  if (mode === "reset-sent") {
    return (
      <AuthShell>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>📬</div>
        <h1 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 800, color: "#FFFFFF" }}>
          Check your inbox
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: "14px", color: "rgba(200,180,255,0.70)", lineHeight: 1.5 }}>
          We've sent a password reset link to{" "}
          <span style={{ color: "#C084FC", fontWeight: 600 }}>{resetEmail}</span>.
          Check your spam folder if you don't see it.
        </p>
        <button
          type="button"
          onClick={() => setMode("signin")}
          className="si-submit-btn"
          style={{
            width: "100%", height: "50px", borderRadius: "999px",
            background: "linear-gradient(90deg, #a855f7 0%, #ec4899 100%)",
            border: "none", color: "#FFFFFF", fontSize: "16px", fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 0 28px rgba(236,72,153,0.50), 0 4px 18px rgba(0,0,0,0.30)",
            fontFamily: "inherit",
          }}
        >
          Back to Sign in
        </button>
      </AuthShell>
    );
  }

  // ── Forgot-password form ─────────────────────────────────────────────────
  if (mode === "reset") {
    return (
      <AuthShell>
        <h1 style={{ margin: "0 0 6px", fontSize: "24px", fontWeight: 800, color: "#FFFFFF" }}>
          Reset password
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: "14px", color: "rgba(200,180,255,0.65)" }}>
          Enter your email and we'll send you a reset link.
        </p>

        <form onSubmit={onSendReset} style={{ display: "flex", flexDirection: "column", gap: "14px", textAlign: "left" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(200,180,255,0.80)", marginBottom: "7px" }}>
              Email
            </label>
            <input
              type="email" required
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ ...INPUT_STYLE }}
              onFocus={glowFocus} onBlur={glowBlur}
              autoFocus
            />
          </div>

          {resetError && <ErrorBanner>{resetError}</ErrorBanner>}

          <button
            type="submit" disabled={resetBusy}
            className="si-submit-btn"
            style={{
              width: "100%", height: "50px", borderRadius: "999px",
              background: resetBusy ? "rgba(75,65,110,0.7)" : "linear-gradient(90deg, #a855f7 0%, #ec4899 100%)",
              border: "none", color: "#FFFFFF", fontSize: "16px", fontWeight: 700,
              cursor: resetBusy ? "not-allowed" : "pointer",
              boxShadow: resetBusy ? "none" : "0 0 28px rgba(236,72,153,0.50), 0 4px 18px rgba(0,0,0,0.30)",
              fontFamily: "inherit", marginTop: "4px",
            }}
          >
            {resetBusy ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode("signin")}
          style={{
            marginTop: "16px", background: "none", border: "none",
            color: "rgba(200,180,255,0.50)", fontSize: "14px",
            cursor: "pointer", fontFamily: "inherit", width: "100%",
          }}
        >
          ← Back to Sign in
        </button>
      </AuthShell>
    );
  }

  // ── Main sign-in view ────────────────────────────────────────────────────
  return (
    <AuthShell>
      <h1 style={{ margin: "0 0 5px", fontSize: "26px", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.4px" }}>
        Welcome back
      </h1>
      <p style={{ margin: "0 0 26px", fontSize: "14px", color: "rgba(200,180,255,0.65)" }}>
        Sign in to your personal parenting coach
      </p>

      {/* Phone OTP (wrapped so button picks up si-phone-btn hover class) */}
      <div className="si-phone-wrapper">
        <PhoneAuthFlow onError={msg => setError(msg)} />
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
        <div style={{ flex: 1, height: "1px", background: "rgba(168,85,247,0.15)" }} />
        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)" }}>or</span>
        <div style={{ flex: 1, height: "1px", background: "rgba(168,85,247,0.15)" }} />
      </div>

      {/* Email + password */}
      <form onSubmit={onEmail} style={{ display: "flex", flexDirection: "column", gap: "14px", textAlign: "left" }}>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(200,180,255,0.80)", marginBottom: "7px" }}>
            Email
          </label>
          <input
            type="email" required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ ...INPUT_STYLE }}
            onFocus={glowFocus} onBlur={glowBlur}
          />
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "7px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "rgba(200,180,255,0.80)" }}>Password</label>
            <button
              type="button" onClick={onForgotOpen}
              style={{
                background: "none", border: "none", padding: 0,
                fontSize: "12px", color: "#a855f7", fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Forgot password?
            </button>
          </div>
          <div style={{ position: "relative" }}>
            <input
              type={showPass ? "text" : "password"} required minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ ...INPUT_STYLE, paddingRight: "44px" }}
              onFocus={glowFocus} onBlur={glowBlur}
            />
            <button
              type="button" onClick={() => setShowPass(s => !s)}
              style={{
                position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(200,180,255,0.50)", fontSize: "13px", padding: 0,
              }}
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <button
          type="submit" disabled={busy}
          className="si-submit-btn"
          style={{
            width: "100%", height: "50px", borderRadius: "999px",
            background: busy ? "rgba(75,65,110,0.7)" : "linear-gradient(90deg, #a855f7 0%, #ec4899 100%)",
            border: "none", color: "#FFFFFF", fontSize: "16px", fontWeight: 700,
            cursor: busy ? "not-allowed" : "pointer",
            boxShadow: busy ? "none" : "0 0 28px rgba(236,72,153,0.50), 0 4px 18px rgba(0,0,0,0.30)",
            fontFamily: "inherit", marginTop: "4px",
          }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p style={{ marginTop: "20px", fontSize: "14px", color: "rgba(200,180,255,0.50)", textAlign: "center" }}>
        Don't have an account?{" "}
        <Link href="/sign-up" style={{ color: "#a855f7", fontWeight: 600, textDecoration: "none" }}>
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}

// ── Shared error banner ────────────────────────────────────────────────────────
function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "13px", color: "#FF8080",
      background: "rgba(255,60,60,0.10)", border: "1px solid rgba(255,60,60,0.22)",
      borderRadius: "12px", padding: "10px 14px",
    }}>
      {children}
    </div>
  );
}
