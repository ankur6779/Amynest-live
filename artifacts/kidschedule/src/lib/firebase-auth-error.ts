import {
  VerificationInflightError,
  VerificationRateLimitError,
} from "./email-verification-rate";

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
      return "Email/Password sign-in is not enabled. Go to Firebase Console → Authentication → Sign-in method → enable Email/Password.";
    case "auth/unauthorized-domain":
      return `This domain is not authorized in Firebase. Add "${typeof window !== "undefined" ? window.location.hostname : "this domain"}" to Firebase Console → Authentication → Settings → Authorized domains.`;
    case "auth/unauthorized-continue-uri":
      return "Verification link domain is not allowed. Ensure amynest.in (and your app URL) are listed under Firebase → Authentication → Authorized domains.";
    case "auth/missing-email":
      return "No email on this account. Sign out and sign up again with an email address.";
    case "auth/requires-recent-login":
      return "Please sign out, sign in again, then resend the verification email.";
    case "auth/popup-blocked":
      return "Popup was blocked. Please allow popups for this site and try again.";
    case "auth/popup-closed-by-user":
      return "";
    case "auth/network-request-failed":
      return "Network error. Check your connection and retry.";
    case "app/verification-inflight":
      return "Verification email is already being sent. Wait a moment and try again.";
    case "app/no-auth-session":
      return "You are not signed in. Go back to Sign in and try again.";
    default: {
      const message = (err as { message?: string })?.message?.trim();
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
