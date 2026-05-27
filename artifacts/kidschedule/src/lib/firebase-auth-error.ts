import {
  VerificationInflightError,
  VerificationRateLimitError,
} from "./email-verification-rate";
import { getFirebaseAppleOAuthHandlerUrl } from "@/lib/apple-auth-defaults";

export type ParsedFirebaseAuthError = {
  code: string;
  message: string;
  userMessage: string;
};

const VERIFY_ERROR_STORAGE_KEY = "amynest_verify_send_error";

/** Firebase Auth errors use `code` + `message` (not always `Error` subclasses). */
export function parseFirebaseAuthError(err: unknown): ParsedFirebaseAuthError {
  const code =
    (err as { code?: string })?.code ??
    (err instanceof VerificationRateLimitError ? "app/verification-rate-limited" : "unknown");
  const message =
    (err as { message?: string })?.message ??
    (typeof err === "string" ? err : "Unknown error");

  return {
    code,
    message,
    userMessage: prettyAuthError(err),
  };
}

export function logFirebaseAuthError(context: string, err: unknown): ParsedFirebaseAuthError {
  const parsed = parseFirebaseAuthError(err);
  console.error(`[firebase-auth] ${context}`, {
    code: parsed.code,
    message: parsed.message,
    userMessage: parsed.userMessage,
    raw: err,
  });
  return parsed;
}

/** Persist last verification-send failure for the verify-email screen. */
export function stashVerificationSendError(err: unknown): void {
  if (typeof window === "undefined") return;
  try {
    const parsed = parseFirebaseAuthError(err);
    sessionStorage.setItem(
      VERIFY_ERROR_STORAGE_KEY,
      JSON.stringify({ ...parsed, at: new Date().toISOString() }),
    );
  } catch {
    /* ignore */
  }
}

export function consumeVerificationSendError(): ParsedFirebaseAuthError | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(VERIFY_ERROR_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(VERIFY_ERROR_STORAGE_KEY);
    const data = JSON.parse(raw) as ParsedFirebaseAuthError;
    if (typeof data.userMessage === "string") return data;
    return null;
  } catch {
    return null;
  }
}

export function prettyAuthError(err: unknown): string {
  if (err instanceof VerificationInflightError) {
    return "Verification email is already being sent. Wait a moment and try again.";
  }
  if (err instanceof VerificationRateLimitError) {
    const seconds = Math.max(1, Math.ceil((err.blockedUntil - Date.now()) / 1000));
    return `Too many attempts. Try again in ${seconds} seconds.`;
  }

  const code = (err as { code?: string })?.code;
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
      return "This sign-in method is not enabled. Open Firebase Console → Authentication → Sign-in method and turn on the provider you are using.";
    case "auth/unauthorized-domain":
      return `This domain is not authorized in Firebase. Add "${typeof window !== "undefined" ? window.location.hostname : "this domain"}" to Firebase Console → Authentication → Settings → Authorized domains.`;
    case "auth/unauthorized-continue-uri":
      return "Verification link domain is not allowed. Add www.amynest.in under Firebase → Authentication → Settings → Authorized domains, and set the shared email action URL to https://www.amynest.in/auth/action";
    case "auth/missing-email":
      return "No email on this account. Sign out and sign up again with an email address.";
    case "auth/requires-recent-login":
      return "Please sign out, sign in again, then resend the verification email.";
    case "auth/popup-blocked":
      return "Popup was blocked. Please allow popups for this site and try again.";
    case "auth/popup-closed-by-user":
      return "";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method. Try email and password or the method you used originally.";
    case "auth/credential-already-in-use":
      return "This Google account is already linked to another user.";
    case "auth/argument-error":
      return "Google sign-in could not complete in the app. Use the in-app Google button (not the browser), or update the app from the Play Store.";
    case "app/auth-bridge-unavailable":
      return "Google Sign-In is not ready. Close and reopen the app, then try again.";
    case "app/google-native-required":
      return "Google Sign-In must use the in-app account picker. Update the app from the Play Store.";
    case "app/google-sign-in-incomplete":
      return "Google sign-in did not finish after choosing an account. Close and reopen the app, then try again.";
    case "app/google-no-id-token":
      return "Google sign-in did not complete. Please try again.";
    case "app/apple-not-configured":
      return "Apple Sign-In is not configured for this build.";
    case "app/apple-no-id-token":
      return "Apple sign-in did not complete. Please try again.";
    case "app/apple-session-expired":
      return "Apple sign-in session expired. Please try again.";
    case "app/apple-sign-in-failed":
      return "Apple sign-in failed. Please try again.";
    case "app/apple-simulator-unsupported":
      return "Sign in with Apple doesn't work in the iOS Simulator. Please use email + password here, or test Apple Sign-In on a real device.";
    case "app/apple-canceled":
      return "";
    case "auth/captcha-check-failed": {
      const host = typeof window !== "undefined" ? window.location.hostname : "";
      if (host === "amynest.in") {
        return (
          "Phone OTP failed on amynest.in — open https://www.amynest.in/sign-in " +
          "(the site redirects apex to www automatically)."
        );
      }
      return (
        `Phone verification security check failed on "${host || "this domain"}". ` +
        "In Firebase Console → Authentication → Settings → Authorized domains, ensure amynest.in and www.amynest.in are listed."
      );
    }
    case "auth/invalid-app-credential":
    case "auth/missing-app-credential":
      return "Phone sign-in is not configured for this app. Check Firebase Console → Authentication → Sign-in method → Phone, and ensure your domain is authorized.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and retry.";
    case "auth/expired-action-code":
      return "This link has expired. Request a new password reset from Sign in.";
    case "auth/invalid-action-code":
      return "This link is invalid or has already been used. Request a new password reset.";
    case "app/verification-inflight":
      return "Verification email is already being sent. Wait a moment and try again.";
    case "app/no-auth-session":
      return "You are not signed in. Go back to Sign in and try again.";
    default: {
      const message = (err as { message?: string })?.message?.trim();
      // Apple's native AuthorizationError has no `code` field — it just
      // throws with a message containing
      // "com.apple.AuthenticationServices.AuthorizationError error <N>".
      // Codes we surface as clear UX:
      //   1000 → "unknown" — most commonly the iOS Simulator (Apple Sign-In
      //          is not supported there) or no signed-in iCloud account.
      //   1001 → canceled by user (silent).
      //   1004 → "failed" — usually transient network issue.
      if (
        message &&
        /AuthenticationServices\.AuthorizationError|ASAuthorizationError/i.test(message)
      ) {
        if (/error\s+1001/i.test(message)) return "";
        if (/error\s+1000/i.test(message)) {
          return "Sign in with Apple doesn't work in the iOS Simulator (or no iCloud account is signed in). Please use email + password here, or test Apple Sign-In on a real device with iCloud signed in.";
        }
        if (/error\s+1004/i.test(message)) {
          return "Apple Sign-In failed (network). Check your connection and try again.";
        }
        return "Apple Sign-In could not be completed. Please try again or use email + password.";
      }
      if (
        message &&
        /invalid.request|invalid_request|invalid web redirect/i.test(message)
      ) {
        const handler = getFirebaseAppleOAuthHandlerUrl();
        return (
          "Apple Sign-In is not configured correctly. In Apple Developer → " +
          "Identifiers → your Services ID → Sign in with Apple → Configure, " +
          `add Return URL: ${handler}. Also enable Apple in Firebase Authentication ` +
          "with the same Services ID, Team ID, Key ID, and .p8 key."
        );
      }
      if (
        message &&
        (message.includes("Hostname match not found") ||
          message.includes("captcha-check-failed"))
      ) {
        const host = typeof window !== "undefined" ? window.location.hostname : "";
        if (host === "amynest.in") {
          return (
            "Phone OTP failed on amynest.in — open https://www.amynest.in/sign-in " +
            "(apex redirects to www before sign-in)."
          );
        }
        return `Phone verification failed. Add "${host}" to Firebase Authorized domains (amynest.in and www.amynest.in).`;
      }
      if (message && !message.startsWith("Firebase:")) {
        return message;
      }
      if (message) {
        return message.replace(/^Firebase:\s*/i, "");
      }
      return "Something went wrong. Please try again.";
    }
  }
}

/** User-visible message with Firebase code for support/debugging. */
export function formatAuthErrorForUi(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "userMessage" in err &&
    typeof (err as ParsedFirebaseAuthError).userMessage === "string"
  ) {
    const p = err as ParsedFirebaseAuthError;
    if (p.code && p.code !== "unknown" && !p.code.startsWith("app/")) {
      return `${p.userMessage} (${p.code})`;
    }
    return p.userMessage;
  }

  const parsed = parseFirebaseAuthError(err);
  if (!parsed.userMessage) return parsed.message;
  if (parsed.code && parsed.code !== "unknown" && !parsed.code.startsWith("app/")) {
    return `${parsed.userMessage} (${parsed.code})`;
  }
  return parsed.userMessage;
}
