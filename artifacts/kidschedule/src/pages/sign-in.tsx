import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { prettyAuthError } from "@/lib/auth-errors";
import PhoneAuthFlow from "@/components/phone-auth-flow";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const ORB1: React.CSSProperties = {
  position: "absolute", top: "-140px", right: "-100px",
  width: "420px", height: "420px", borderRadius: "50%",
  background: "radial-gradient(circle, rgba(123,63,242,0.40) 0%, transparent 70%)",
  filter: "blur(48px)", pointerEvents: "none",
};
const ORB2: React.CSSProperties = {
  position: "absolute", bottom: "-80px", left: "-120px",
  width: "380px", height: "380px", borderRadius: "50%",
  background: "radial-gradient(circle, rgba(255,78,205,0.28) 0%, transparent 70%)",
  filter: "blur(48px)", pointerEvents: "none",
};
const ORB3: React.CSSProperties = {
  position: "absolute", top: "45%", left: "30%",
  width: "260px", height: "260px", borderRadius: "50%",
  background: "radial-gradient(circle, rgba(80,30,180,0.22) 0%, transparent 70%)",
  filter: "blur(60px)", pointerEvents: "none",
};

const CARD: React.CSSProperties = {
  background: "rgba(18, 4, 45, 0.70)",
  backdropFilter: "blur(28px)",
  WebkitBackdropFilter: "blur(28px)",
  borderRadius: "28px",
  border: "1px solid rgba(123,63,242,0.32)",
  boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 48px rgba(123,63,242,0.18), 0 32px 80px rgba(0,0,0,0.55)",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%", height: "48px", padding: "0 16px",
  borderRadius: "14px", outline: "none", fontSize: "15px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(123,63,242,0.25)",
  color: "#F0E8FF",
  fontFamily: "inherit",
  boxSizing: "border-box",
  transition: "border-color 0.18s, box-shadow 0.18s",
};

function glowFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "rgba(123,63,242,0.80)";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(123,63,242,0.22)";
}
function glowBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "rgba(123,63,242,0.25)";
  e.currentTarget.style.boxShadow = "none";
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 16px",
        background: "linear-gradient(140deg, #0D0022 0%, #180040 35%, #0A001E 65%, #130035 100%)",
        position: "relative", overflow: "hidden",
      }}
    >
      <div style={ORB1} />
      <div style={ORB2} />
      <div style={ORB3} />

      <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>
        <div style={CARD}>
          <div style={{ padding: "36px 32px 28px", textAlign: "center" }}>
            <div style={{
              width: "72px", height: "72px", borderRadius: "50%",
              margin: "0 auto 20px",
              background: "rgba(123,63,242,0.18)",
              border: "1.5px solid rgba(123,63,242,0.55)",
              boxShadow: "0 0 28px rgba(123,63,242,0.45), 0 0 8px rgba(123,63,242,0.25) inset",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}>
              <img src={`${basePath}/amynest-logo.png`} alt="AmyNest" style={{ width: "56px", height: "56px", borderRadius: "50%" }} />
            </div>
            {children}
          </div>
        </div>
        <p style={{ marginTop: "20px", textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.28)" }}>
          Where Smart Parenting Begins
        </p>
      </div>
    </div>
  );
}

type ViewMode = "signin" | "reset" | "reset-sent";

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const [mode, setMode] = useState<ViewMode>("signin");

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset-password state
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
          style={{
            width: "100%", height: "50px", borderRadius: "14px",
            background: "linear-gradient(90deg, #7B3FF2 0%, #FF4ECD 100%)",
            border: "none", color: "#FFFFFF", fontSize: "16px", fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 24px rgba(123,63,242,0.55)",
            fontFamily: "inherit",
          }}
        >
          Back to Sign in
        </button>
      </AuthShell>
    );
  }

  if (mode === "reset") {
    return (
      <AuthShell>
        <h1 style={{ margin: "0 0 6px", fontSize: "24px", fontWeight: 800, color: "#FFFFFF" }}>
          Reset password
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: "14px", color: "rgba(200,180,255,0.70)" }}>
          Enter your email and we'll send you a reset link.
        </p>

        <form onSubmit={onSendReset} style={{ display: "flex", flexDirection: "column", gap: "14px", textAlign: "left" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(200,180,255,0.80)", marginBottom: "7px" }}>
              Email
            </label>
            <input
              type="email"
              required
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ ...INPUT_STYLE }}
              onFocus={glowFocus}
              onBlur={glowBlur}
              autoFocus
            />
          </div>

          {resetError && (
            <div style={{
              fontSize: "13px", color: "#FF8080",
              background: "rgba(255,60,60,0.12)", border: "1px solid rgba(255,60,60,0.25)",
              borderRadius: "12px", padding: "10px 14px",
            }}>
              {resetError}
            </div>
          )}

          <button
            type="submit"
            disabled={resetBusy}
            style={{
              width: "100%", height: "50px", borderRadius: "14px",
              background: resetBusy ? "rgba(75,75,107,0.7)" : "linear-gradient(90deg, #7B3FF2 0%, #FF4ECD 100%)",
              border: "none", color: "#FFFFFF", fontSize: "16px", fontWeight: 700,
              cursor: resetBusy ? "not-allowed" : "pointer",
              boxShadow: resetBusy ? "none" : "0 4px 24px rgba(123,63,242,0.55)",
              fontFamily: "inherit",
              marginTop: "4px",
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
            color: "rgba(200,180,255,0.55)", fontSize: "14px",
            cursor: "pointer", fontFamily: "inherit", width: "100%",
          }}
        >
          ← Back to Sign in
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 style={{ margin: "0 0 6px", fontSize: "26px", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.5px" }}>
        Welcome back
      </h1>
      <p style={{ margin: "0 0 28px", fontSize: "14px", color: "rgba(200,180,255,0.70)" }}>
        Sign in to your personal parenting coach
      </p>

      {/* Phone OTP */}
      <PhoneAuthFlow onError={msg => setError(msg)} />

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.10)" }} />
        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>or</span>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.10)" }} />
      </div>

      <form onSubmit={onEmail} style={{ display: "flex", flexDirection: "column", gap: "14px", textAlign: "left" }}>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(200,180,255,0.80)", marginBottom: "7px" }}>
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ ...INPUT_STYLE }}
            onFocus={glowFocus}
            onBlur={glowBlur}
          />
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "7px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "rgba(200,180,255,0.80)" }}>
              Password
            </label>
            <button
              type="button"
              onClick={onForgotOpen}
              style={{
                background: "none", border: "none", padding: 0,
                fontSize: "12px", color: "#C084FC", fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                textDecoration: "none",
              }}
            >
              Forgot password?
            </button>
          </div>
          <div style={{ position: "relative" }}>
            <input
              type={showPass ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
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
                color: "rgba(200,180,255,0.55)", fontSize: "13px", padding: "0",
              }}
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            fontSize: "13px", color: "#FF8080",
            background: "rgba(255,60,60,0.12)", border: "1px solid rgba(255,60,60,0.25)",
            borderRadius: "12px", padding: "10px 14px",
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{
            width: "100%", height: "50px", borderRadius: "14px",
            background: busy ? "rgba(75,75,107,0.7)" : "linear-gradient(90deg, #7B3FF2 0%, #FF4ECD 100%)",
            border: "none", color: "#FFFFFF", fontSize: "16px", fontWeight: 700,
            cursor: busy ? "not-allowed" : "pointer",
            boxShadow: busy ? "none" : "0 4px 24px rgba(123,63,242,0.55), 0 0 0 1px rgba(255,78,205,0.20)",
            transition: "opacity 0.18s, box-shadow 0.18s",
            fontFamily: "inherit",
            marginTop: "4px",
          }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p style={{ marginTop: "20px", fontSize: "14px", color: "rgba(200,180,255,0.55)", textAlign: "center" }}>
        Don't have an account?{" "}
        <Link href="/sign-up" style={{ color: "#C084FC", fontWeight: 600, textDecoration: "none" }}>
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
