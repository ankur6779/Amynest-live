import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  updateProfile,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { prettyAuthError } from "@/pages/sign-in";

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

export default function SignUpPage() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      const cred = await createUserWithEmailAndPassword(
        firebaseAuth,
        email.trim(),
        password,
      );
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
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Join AmyNest AI</h1>
      <p className="text-sm text-slate-500 mb-6">
        Your AI-powered parenting coach, personalized for your family
      </p>

      <button
        type="button"
        onClick={onGoogle}
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

      <div className="flex items-center gap-3 my-5">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={onEmail} className="space-y-3 text-left">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Your name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
        </div>
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
          <p className="mt-1 text-[11px] text-slate-400">
            At least 6 characters.
          </p>
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
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-indigo-600 font-semibold">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
