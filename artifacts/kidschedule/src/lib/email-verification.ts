import { sendEmailVerification, type ActionCodeSettings, type User } from "firebase/auth";
import { logFirebaseAuthError } from "./firebase-auth-error";
import {
  getVerificationRateStatus,
  isVerificationSendInflight,
  recordVerificationSendSuccess,
  setVerificationSendInflight,
  VerificationInflightError,
  VerificationRateLimitError,
} from "./email-verification-rate";

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
 * Email verification uses **Firebase Auth** `sendEmailVerification` (client SDK).
 * It does NOT call the AmyNest API or Resend — Resend is only for weekly recap emails on the server.
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
  const url = getEmailVerificationCallbackUrl();
  return {
    url,
    handleCodeInApp: true,
  };
}

function logVerificationEvent(
  event: string,
  user: User,
  extra?: Record<string, unknown>,
): void {
  console.info("[email-verification]", {
    event,
    provider: "firebase-auth",
    email: user.email ?? "(no-email)",
    uid: user.uid,
    callbackUrl: getEmailVerificationCallbackUrl(),
    at: new Date().toISOString(),
    ...extra,
  });
}

/**
 * Send Firebase verification email. Requires an active `firebaseAuth` session.
 * @throws Firebase `auth/*` errors, {@link VerificationRateLimitError}, {@link VerificationInflightError}
 */
export async function sendUserEmailVerification(user: User): Promise<void> {
  if (!user.email) {
    const err = { code: "auth/missing-email", message: "User has no email" };
    logFirebaseAuthError("sendUserEmailVerification:no-email", err);
    throw err;
  }

  if (isVerificationSendInflight(user.uid)) {
    logVerificationEvent("send_skipped_inflight", user);
    throw new VerificationInflightError();
  }

  const before = getVerificationRateStatus(user.uid);
  if (!before.canSend) {
    logVerificationEvent("rate_limit_blocked", user, {
      attempts: before.attempts,
      blockedUntil: before.blockedUntil,
    });
    throw new VerificationRateLimitError(
      before.blockedUntil ?? Date.now() + 60_000,
    );
  }

  const settings = getEmailVerificationActionCodeSettings();
  setVerificationSendInflight(user.uid, true);
  logVerificationEvent("send_attempt", user, {
    attempts: before.attempts,
    continueUrl: settings.url,
  });

  try {
    await sendEmailVerification(user, settings);
    const after = recordVerificationSendSuccess(user.uid);
    logVerificationEvent("send_success", user, {
      attempts: after.attempts,
      blockedUntil: after.blockedUntil,
    });
  } catch (err: unknown) {
    logFirebaseAuthError("sendEmailVerification", err);
    logVerificationEvent("send_failed", user, {
      attempts: before.attempts,
      continueUrl: settings.url,
    });
    throw err;
  } finally {
    setVerificationSendInflight(user.uid, false);
  }
}
