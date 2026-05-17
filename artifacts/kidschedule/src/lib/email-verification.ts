import {
  sendEmailVerification,
  type ActionCodeSettings,
  type User,
} from "firebase/auth";
import { logFirebaseAuthError } from "./firebase-auth-error";
import {
  getVerificationRateStatus,
  isVerificationSendInflight,
  recordVerificationSendSuccess,
  setVerificationSendInflight,
  VerificationInflightError,
  VerificationRateLimitError,
} from "./email-verification-rate";

/**
 * Must match Firebase Console → Authentication → Templates → action URL host/path
 * and be listed under Authentication → Settings → Authorized domains (amynest.in).
 */
export const CANONICAL_EMAIL_VERIFICATION_URL = "https://amynest.in/verify-email";

/** Alternate paths handled by AuthCallbackPage (template may use /auth/action). */
export const LEGACY_EMAIL_VERIFICATION_PATHS = [
  "/auth/callback",
  "/auth/action",
] as const;

/**
 * Email verification uses **Firebase Auth** `sendEmailVerification` (client SDK).
 * It does NOT call the AmyNest API or Resend.
 */
export function getEmailVerificationCallbackUrl(): string {
  const fromEnv = (
    import.meta.env.VITE_EMAIL_VERIFICATION_CALLBACK_URL as string | undefined
  )?.trim();
  if (fromEnv) return fromEnv;

  if (typeof window !== "undefined" && window.location?.hostname) {
    const { hostname, origin } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${origin}/verify-email`;
    }
  }

  // Always use authorized production domain — avoids auth/unauthorized-continue-uri on Render hosts.
  return CANONICAL_EMAIL_VERIFICATION_URL;
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

function isUnauthorizedContinueUri(err: unknown): boolean {
  return (err as { code?: string })?.code === "auth/unauthorized-continue-uri";
}

async function sendViaFirebase(
  user: User,
  settings: ActionCodeSettings | null,
): Promise<void> {
  if (settings) {
    await sendEmailVerification(user, settings);
  } else {
    await sendEmailVerification(user);
  }
}

/**
 * Send Firebase verification email. Requires an active `firebaseAuth` session.
 * Falls back to default Firebase email (no custom continue URL) if the custom URL is rejected.
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

  try {
    logVerificationEvent("send_attempt", user, {
      attempts: before.attempts,
      continueUrl: settings.url,
      handleCodeInApp: settings.handleCodeInApp,
    });

    try {
      await sendViaFirebase(user, settings);
    } catch (err: unknown) {
      if (!isUnauthorizedContinueUri(err)) {
        throw err;
      }

      logFirebaseAuthError("sendEmailVerification:custom-url-rejected", err);
      console.warn(
        "[email-verification] Custom continue URL rejected by Firebase; retrying with default handler (no custom url).",
        { attemptedUrl: settings.url },
      );

      logVerificationEvent("send_attempt_fallback", user, {
        attempts: before.attempts,
        reason: "auth/unauthorized-continue-uri",
      });

      await sendViaFirebase(user, null);
    }

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
      firebaseCode: (err as { code?: string })?.code ?? "unknown",
      firebaseMessage: (err as { message?: string })?.message ?? "",
    });
    throw err;
  } finally {
    setVerificationSendInflight(user.uid, false);
  }
}
