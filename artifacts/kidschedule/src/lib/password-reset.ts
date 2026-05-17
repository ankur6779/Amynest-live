import { sendPasswordResetEmail, type ActionCodeSettings } from "firebase/auth";
import { firebaseAuth } from "./firebase";
import { logFirebaseAuthError } from "./firebase-auth-error";
import { parseFirebaseActionParams } from "./firebase-action-params";

import {
  CANONICAL_FIREBASE_ACTION_URL,
  getFirebaseActionUrlForLocalDev,
} from "./firebase-action-url";

/** @deprecated Use CANONICAL_FIREBASE_ACTION_URL — Firebase has one shared template URL. */
export const CANONICAL_PASSWORD_RESET_URL = CANONICAL_FIREBASE_ACTION_URL;

export function getPasswordResetContinueUrl(): string {
  const fromEnv = (
    import.meta.env.VITE_PASSWORD_RESET_URL as string | undefined
  )?.trim();
  if (fromEnv) return fromEnv;

  return getFirebaseActionUrlForLocalDev();
}

export function getPasswordResetActionCodeSettings(): ActionCodeSettings {
  return {
    url: getPasswordResetContinueUrl(),
    handleCodeInApp: true,
  };
}

/** @deprecated Use parseFirebaseActionParams */
export function parsePasswordResetActionParams(
  location: Pick<Location, "search" | "hash"> = window.location,
) {
  return parseFirebaseActionParams(location);
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
