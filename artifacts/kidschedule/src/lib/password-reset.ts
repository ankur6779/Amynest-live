import { sendPasswordResetEmail, type ActionCodeSettings } from "firebase/auth";
import { firebaseAuth } from "./firebase";
import { logFirebaseAuthError } from "./firebase-auth-error";

/** Must be authorized in Firebase → Authentication → Settings → Authorized domains. */
export const CANONICAL_PASSWORD_RESET_URL = "https://amynest.in/reset-password";

export function getPasswordResetContinueUrl(): string {
  const fromEnv = (
    import.meta.env.VITE_PASSWORD_RESET_URL as string | undefined
  )?.trim();
  if (fromEnv) return fromEnv;

  if (typeof window !== "undefined" && window.location?.hostname) {
    const { hostname, origin } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${origin}/reset-password`;
    }
  }

  return CANONICAL_PASSWORD_RESET_URL;
}

export function getPasswordResetActionCodeSettings(): ActionCodeSettings {
  return {
    url: getPasswordResetContinueUrl(),
    handleCodeInApp: true,
  };
}

/** Parse Firebase action link params from search or hash. */
export function parsePasswordResetActionParams(location: Location = window.location): {
  mode: string | null;
  oobCode: string | null;
} {
  const search = new URLSearchParams(location.search);
  let mode = search.get("mode");
  let oobCode = search.get("oobCode");

  if ((!mode || !oobCode) && location.hash) {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    mode = mode ?? hash.get("mode");
    oobCode = oobCode ?? hash.get("oobCode");
  }

  return { mode, oobCode };
}

function isUnauthorizedContinueUri(err: unknown): boolean {
  return (err as { code?: string })?.code === "auth/unauthorized-continue-uri";
}

/** Send password reset email via Firebase (not Resend/API). */
export async function sendUserPasswordResetEmail(email: string): Promise<void> {
  const settings = getPasswordResetActionCodeSettings();
  console.info("[password-reset] send attempt", {
    email,
    continueUrl: settings.url,
  });

  try {
    await sendPasswordResetEmail(firebaseAuth, email.trim(), settings);
  } catch (err: unknown) {
    if (!isUnauthorizedContinueUri(err)) {
      logFirebaseAuthError("sendPasswordResetEmail", err);
      throw err;
    }
    console.warn(
      "[password-reset] Custom continue URL rejected; retrying with Firebase default.",
      { attemptedUrl: settings.url },
    );
    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
    } catch (fallbackErr: unknown) {
      logFirebaseAuthError("sendPasswordResetEmail:fallback", fallbackErr);
      throw fallbackErr;
    }
  }

  console.info("[password-reset] send success", { email });
}
