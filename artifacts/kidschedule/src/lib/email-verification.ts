import type { ActionCodeSettings } from "firebase/auth";

/** Canonical prod callback — must be in Firebase → Authentication → Authorized domains. */
const PRODUCTION_CALLBACK = "https://amynest.in/auth/callback";

/** Hosts where `window.location.origin` is already allowlisted in Firebase. */
const USE_CURRENT_ORIGIN_HOSTS = new Set([
  "amynest.in",
  "www.amynest.in",
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

  // Render URLs (e.g. amynest-live-1.onrender.com) are not allowlisted by default — use amynest.in.
  return PRODUCTION_CALLBACK;
}

export function getEmailVerificationActionCodeSettings(): ActionCodeSettings {
  return {
    url: getEmailVerificationCallbackUrl(),
    handleCodeInApp: true,
  };
}
