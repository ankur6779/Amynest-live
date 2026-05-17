import { sendEmailVerification, type ActionCodeSettings, type User } from "firebase/auth";
import {
  getVerificationRateStatus,
  isVerificationSendInflight,
  recordVerificationSendSuccess,
  setVerificationSendInflight,
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

function logVerificationEvent(
  event: string,
  user: User,
  extra?: Record<string, unknown>,
): void {
  const email = user.email ?? "(no-email)";
  console.info("[email-verification]", {
    event,
    email,
    uid: user.uid,
    at: new Date().toISOString(),
    ...extra,
  });
}

/**
 * Send Firebase verification email with client rate limiting and in-flight dedupe.
 * @throws {VerificationRateLimitError} after local attempt cap
 */
export async function sendUserEmailVerification(user: User): Promise<void> {
  if (isVerificationSendInflight(user.uid)) {
    logVerificationEvent("send_skipped_inflight", user);
    return;
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

  setVerificationSendInflight(user.uid, true);
  logVerificationEvent("send_attempt", user, { attempts: before.attempts });

  try {
    await sendEmailVerification(user, getEmailVerificationActionCodeSettings());
    const after = recordVerificationSendSuccess(user.uid);
    logVerificationEvent("send_success", user, {
      attempts: after.attempts,
      blockedUntil: after.blockedUntil,
    });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    logVerificationEvent("send_failed", user, {
      attempts: before.attempts,
      firebaseCode: code ?? "unknown",
    });
    if (code === "auth/too-many-requests") {
      console.warn("[email-verification] Firebase auth/too-many-requests", {
        email: user.email,
        uid: user.uid,
      });
    }
    throw err;
  } finally {
    setVerificationSendInflight(user.uid, false);
  }
}
