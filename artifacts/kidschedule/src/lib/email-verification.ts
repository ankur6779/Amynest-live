import { sendEmailVerification, type ActionCodeSettings, type User } from "firebase/auth";

/** Canonical prod callback — must be in Firebase → Authentication → Authorized domains. */
const PRODUCTION_CALLBACK = "https://amynest.in/auth/callback";

/** Hosts where `window.location.origin` is allowlisted in Firebase (same-origin session after verify). */
const USE_CURRENT_ORIGIN_HOSTS = new Set([
  "amynest.in",
  "www.amynest.in",
  "amynest-live-1.onrender.com",
  "amynest-frontend-dev.onrender.com",
  "localhost",
  "127.0.0.1",
]);

/**
 * Where Firebase email-verification links should land.
 * Must match a domain in Firebase Console → Authentication → Settings → Authorized domains.
 */
export function getEmailVerificationCallbackUrl(): string {
  const fromEnv = (import.meta.env.VITE_EMAIL_VERIFICATION_CALLBACK_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv;

  if (typeof window !== "undefined" && window.location?.hostname) {
    const { hostname, origin } = window.location;
    if (USE_CURRENT_ORIGIN_HOSTS.has(hostname)) {
      return `${origin}/auth/callback`;
    }
  }

  return PRODUCTION_CALLBACK;
}

export function getEmailVerificationActionCodeSettings(): ActionCodeSettings {
  return {
    url: getEmailVerificationCallbackUrl(),
    handleCodeInApp: true,
  };
}

const SENT_AT_STORAGE_PREFIX = "amynest_verify_email_sent:";

/** Avoid duplicate Firebase sends within a short window (sign-up + verify page). */
export function shouldSkipVerificationEmailSend(uid: string, withinMs = 120_000): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(`${SENT_AT_STORAGE_PREFIX}${uid}`);
    if (!raw) return false;
    return Date.now() - Number(raw) < withinMs;
  } catch {
    return false;
  }
}

export function markVerificationEmailSent(uid: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${SENT_AT_STORAGE_PREFIX}${uid}`, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export async function sendUserEmailVerification(user: User): Promise<void> {
  await sendEmailVerification(user, getEmailVerificationActionCodeSettings());
  markVerificationEmailSent(user.uid);
}
