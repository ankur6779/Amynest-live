import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
} from "firebase/auth";
import { firebaseAuth, authDomain, currentHost, firebaseProjectId } from "@/lib/firebase";
import { useAuth } from "@/lib/firebase-auth";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const googleProvider = new GoogleAuthProvider();

function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(160deg,#EEF2FF 0%,#F5F3FF 50%,#FDF2F8 100%)" }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-indigo-100/60 border border-indigo-100 overflow-hidden">
        <div className="px-7 pt-8 pb-6 text-center">
          <img
            src={`${basePath}/amynest-logo.png`}
            alt="AmyNest"
            className="h-14 w-14 mx-auto rounded-full mb-3"
          />
          {children}
        </div>
      </div>
      <p className="mt-6 text-xs text-slate-400">Where Smart Parenting Begins</p>
    </div>
  );
}

function GoogleButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-full h-11 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 font-semibold text-slate-900 disabled:opacity-60"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.63z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33z"/>
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.34l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
      </svg>
      Continue with Google
    </button>
  );
}

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Redirect as soon as auth state resolves to signed-in — handles both
  // email/password and Google redirect-back without relying solely on
  // getRedirectResult (which can return null on re-mount).
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setLocation("/");
    }
  }, [isLoaded, isSignedIn, setLocation]);

  useEffect(() => {
    setBusy(true);
    getRedirectResult(firebaseAuth)
      .then((result) => {
        if (result?.user) {
          setLocation("/");
        }
      })
      .catch((err: any) => {
        if (err?.code !== "auth/no-current-user") {
          setError(prettyAuthError(err));
        }
      })
      .finally(() => setBusy(false));
  }, []);

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
      if (isMobileBrowser()) {
        await signInWithRedirect(firebaseAuth, googleProvider);
      } else {
        await signInWithPopup(firebaseAuth, googleProvider);
        setLocation("/");
      }
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        setError(prettyAuthError(err));
      }
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
      <p className="text-sm text-slate-500 mb-6">
        Sign in to your personal parenting coach
      </p>

      {/* ── Temporary debug banner — remove once auth works ── */}
      <div className="mb-4 text-left text-[10px] bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 break-all">
        <p className="font-semibold text-amber-700 mb-1">Firebase debug info (temp)</p>
        <p><span className="text-slate-500">Firebase project ID:</span><br /><span className="font-mono text-indigo-700 font-bold">{firebaseProjectId}</span></p>
        <p className="mt-1"><span className="text-slate-500">Add THIS domain in Firebase console:</span><br /><span className="font-mono text-red-600 font-bold">{currentHost}</span></p>
        <p className="mt-1"><span className="text-slate-500">authDomain in config:</span><br /><span className="font-mono text-indigo-700">{authDomain}</span></p>
        <p className="mt-2 text-[9px] text-slate-400">Firebase Console → Authentication → Settings → Authorized domains</p>
      </div>

      <GoogleButton onClick={onGoogle} busy={busy} />

      <div className="flex items-center gap-3 my-5">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={onEmail} className="space-y-3 text-left">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </div>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full h-11 rounded-xl font-semibold text-white shadow-lg shadow-indigo-200/50 disabled:opacity-60"
          style={{ background: "linear-gradient(90deg,#6366F1,#A855F7)" }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-5 text-sm text-slate-500">
        Don't have an account?{" "}
        <Link href="/sign-up" className="text-indigo-600 font-semibold">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}

export function prettyAuthError(err: any): string {
  const code = err?.code as string | undefined;
  switch (code) {
    case "auth/invalid-email":
      return "That email looks invalid.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Wrong email or password.";
    case "auth/email-already-in-use":
      return "An account already exists with this email.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a minute.";
    case "auth/operation-not-allowed":
      return "Email/Password sign-in is not enabled. Go to Firebase Console → Authentication → Sign-in method → enable Email/Password.";
    case "auth/unauthorized-domain":
      return `This domain is not authorized in Firebase. Add "${typeof window !== "undefined" ? window.location.hostname : "this domain"}" to Firebase Console → Authentication → Settings → Authorized domains.`;
    case "auth/popup-blocked":
      return "Popup blocked by the browser. Allow popups and retry.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and retry.";
    default:
      return err?.message || "Something went wrong. Please try again.";
  }
}
