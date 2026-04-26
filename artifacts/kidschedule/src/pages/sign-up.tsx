import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { prettyAuthError } from "@/lib/auth-errors";
import PhoneAuthFlow from "@/components/phone-auth-flow";

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
  .su-submit-btn {
    transition: transform 0.18s ease, box-shadow 0.18s ease !important;
  }
  .su-submit-btn:hover:not(:disabled) {
    transform: scale(1.025) !important;
    box-shadow: 0 0 42px rgba(236,72,153,0.65), 0 6px 22px rgba(0,0,0,0.38) !important;
  }
`;

// ── Input focus / blur ────────────────────────────────────────────────────────
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

// ── Neon ring hero — 140 px, "Meet" + "AMY" inside glass ─────────────────────
function NeonRingHero() {
  const R = 140;
  const INNER = 112;
  const OFF = (R - INNER) / 2;
  const MASK_IN = R / 2 - 6;
  const MASK_OUT = R / 2 - 2;

  return (
    <div style={{ position: "relative", width: R, height: R, margin: "0 auto", zIndex: 2 }}>

      {/* Atmospheric glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: 200, height: 200,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(168,85,247,0.28) 0%, rgba(236,72,153,0.18) 45%, transparent 70%)",
        filter: "blur(24px)",
        animation: "suGlowBreathe 3.5s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* Secondary orbit line */}
      <div style={{
        position: "absolute",
        top: -14, left: -14,
        width: R + 28, height: R + 28,
        borderRadius: "50%",
        border: "1px solid rgba(168,85,247,0.15)",
        pointerEvents: "none",
      }} />

      {/* Pulse wrapper */}
      <div style={{ position: "absolute", inset: 0, animation: "suRingPulse 2.8s ease-in-out infinite" }}>

        {/* Layer 1: conic-gradient ring */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "conic-gradient(from 0deg, #a855f7 0deg, #ec4899 90deg, #a855f7 180deg, #ec4899 270deg, #a855f7 360deg)",
          WebkitMaskImage: `radial-gradient(circle, transparent ${MASK_IN}px, black ${MASK_OUT}px)`,
          maskImage: `radial-gradient(circle, transparent ${MASK_IN}px, black ${MASK_OUT}px)`,
          animation: "suRingRotate 10s linear infinite",
          willChange: "transform",
        }} />

        {/* Layer 2: shimmer arc */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0) 5deg, rgba(255,255,255,0.80) 13deg, rgba(255,255,255,0) 21deg, transparent 21deg)",
          WebkitMaskImage: `radial-gradient(circle, transparent ${MASK_IN}px, black ${MASK_OUT}px)`,
          maskImage: `radial-gradient(circle, transparent ${MASK_IN}px, black ${MASK_OUT}px)`,
          animation: "suShimmerOrbit 3.5s linear infinite",
          willChange: "transform",
        }} />

        {/* Layer 4: flare dot */}
        <div style={{
          position: "absolute",
          width: 7, height: 7,
          top: 8, right: 18,
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 0 7px rgba(255,255,255,0.9), 0 0 16px rgba(168,85,247,0.8), 0 0 22px rgba(236,72,153,0.6)",
          animation: "suFlicker 2.4s ease-in-out infinite",
        }} />

        {/* Layer 3: inner glass circle */}
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
            fontSize: 10, fontWeight: 300, letterSpacing: "3.5px",
            textTransform: "uppercase", color: "rgba(255,255,255,0.78)",
            lineHeight: 1.3, userSelect: "none",
          }}>Meet</span>
          <span style={{
            display: "block",
            fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
            fontSize: 26, fontWeight: 700, letterSpacing: "3px",
            textTransform: "uppercase",
            background: "linear-gradient(92deg, #a855f7 0%, #ec4899 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text",
            color: "transparent", WebkitTextFillColor: "transparent",
            lineHeight: 1.05, userSelect: "none",
            animation: "suAmyGlow 3.2s 0.5s ease-in-out infinite",
          }}>AMY</span>
        </div>
      </div>
    </div>
  );
}

// ── Full-page shell ───────────────────────────────────────────────────────────
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
      <style>{SIGN_UP_CSS}</style>

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
        animation: "suWavePulse 8s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>

        {/* Neon ring hero */}
        <NeonRingHero />

        {/* Floating platform glow */}
        <div style={{
          width: 110, height: 18,
          margin: "-4px auto 0",
          background: "radial-gradient(ellipse at center, rgba(168,85,247,0.50) 0%, rgba(236,72,153,0.28) 45%, transparent 70%)",
          filter: "blur(10px)",
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

// ── Error banner ──────────────────────────────────────────────────────────────
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SignUpPage() {
  const [, setLocation] = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) setLocation("/");
  }, [isLoaded, isSignedIn, setLocation]);

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      if (name.trim()) {
        try {
          await updateProfile(cred.user, { displayName: name.trim() });
        } catch {
          /* non-fatal */
        }
      }
      setLocation("/");
    } catch (err: any) {
      setError(prettyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = email.trim() && password.length >= 6;

  return (
    <AuthShell>
      <h1 style={{ margin: "0 0 5px", fontSize: "26px", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.4px" }}>
        Start Parenting Smart
      </h1>
      <p style={{ margin: "0 0 26px", fontSize: "14px", color: "rgba(200,180,255,0.65)" }}>
        Your AI-powered parenting coach, personalized for your family
      </p>

      {/* Phone OTP */}
      <div className="su-phone-wrapper">
        <PhoneAuthFlow onError={msg => setError(msg)} />
      </div>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
        <div style={{ flex: 1, height: "1px", background: "rgba(168,85,247,0.15)" }} />
        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)" }}>or</span>
        <div style={{ flex: 1, height: "1px", background: "rgba(168,85,247,0.15)" }} />
      </div>

      <form onSubmit={onEmail} style={{ display: "flex", flexDirection: "column", gap: "14px", textAlign: "left" }}>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(200,180,255,0.80)", marginBottom: "7px" }}>
            Your name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="First name"
            style={INPUT_STYLE}
            onFocus={glowFocus}
            onBlur={glowBlur}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(200,180,255,0.80)", marginBottom: "7px" }}>
            Email
          </label>
          <input
            type="email" required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={INPUT_STYLE}
            onFocus={glowFocus}
            onBlur={glowBlur}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(200,180,255,0.80)", marginBottom: "7px" }}>
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPass ? "text" : "password"} required minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              style={{ ...INPUT_STYLE, paddingRight: "44px" }}
              onFocus={glowFocus}
              onBlur={glowBlur}
            />
            <button
              type="button"
              onClick={() => setShowPass(s => !s)}
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
          type="submit"
          disabled={busy || !canSubmit}
          className="su-submit-btn"
          style={{
            width: "100%", height: "50px", borderRadius: "999px",
            background: (busy || !canSubmit) ? "rgba(75,65,110,0.7)" : "linear-gradient(90deg, #a855f7 0%, #ec4899 100%)",
            border: "none", color: "#FFFFFF", fontSize: "16px", fontWeight: 700,
            cursor: (busy || !canSubmit) ? "not-allowed" : "pointer",
            boxShadow: (busy || !canSubmit) ? "none" : "0 0 28px rgba(236,72,153,0.50), 0 4px 18px rgba(0,0,0,0.30)",
            fontFamily: "inherit", marginTop: "4px",
          }}
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p style={{ marginTop: "20px", fontSize: "14px", color: "rgba(200,180,255,0.50)", textAlign: "center" }}>
        Already have an account?{" "}
        <Link href="/sign-in" style={{ color: "#a855f7", fontWeight: 600, textDecoration: "none" }}>
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
