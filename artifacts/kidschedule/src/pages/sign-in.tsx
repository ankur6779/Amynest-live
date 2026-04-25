import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/lib/firebase-auth";
import { prettyAuthError } from "@/lib/auth-errors";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const googleProvider = new GoogleAuthProvider();

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

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
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
      await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      setLocation("/");
    } catch (err: any) {
      setError(prettyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithPopup(firebaseAuth, googleProvider);
      setLocation("/");
    } catch (err: any) {
      const code = err?.code as string | undefined;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setBusy(false);
        return;
      }
      if (code === "auth/popup-blocked") {
        try {
          await signInWithRedirect(firebaseAuth, googleProvider);
        } catch (rErr: any) {
          setError(prettyAuthError(rErr));
          setBusy(false);
        }
      } else {
        setError(prettyAuthError(err));
        setBusy(false);
      }
    }
  };

  return (
    <AuthShell>
      <h1 style={{ margin: "0 0 6px", fontSize: "26px", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.5px" }}>
        Welcome back
      </h1>
      <p style={{ margin: "0 0 28px", fontSize: "14px", color: "rgba(200,180,255,0.70)" }}>
        Sign in to your personal parenting coach
      </p>

      {/* Google */}
      <button
        type="button"
        onClick={onGoogle}
        disabled={busy}
        style={{
          width: "100%", height: "50px", borderRadius: "14px",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.14)",
          color: "#FFFFFF", fontSize: "15px", fontWeight: 600,
          display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
          transition: "background 0.18s, border-color 0.18s",
          fontFamily: "inherit",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(123,63,242,0.18)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(123,63,242,0.50)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.14)"; }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.63z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.34l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
        </svg>
        Continue with Google
      </button>

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
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "rgba(200,180,255,0.80)", marginBottom: "7px" }}>
            Password
          </label>
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
