// Map common error shapes (Firebase, Clerk, fetch, generic Error) to short,
// parent-friendly strings safe to show in toasts and alerts.
// Never returns raw stack traces or raw server error JSON.

type ClerkLikeError = {
  errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
  message?: string;
};

type FetchLikeError = {
  status?: number;
  statusText?: string;
  message?: string;
};

// Firebase Auth error codes → friendly messages
const FIREBASE_FRIENDLY: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password. Please try again.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/user-not-found": "No account found with that email. Please sign up first.",
  "auth/email-already-in-use": "An account with that email already exists. Try signing in instead.",
  "auth/weak-password": "Please choose a stronger password (at least 8 characters).",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/too-many-requests": "Too many attempts. Please wait a minute and try again.",
  "auth/network-request-failed": "Network error. Please check your connection and try again.",
  "auth/user-disabled": "This account has been disabled. Please contact support.",
  "auth/operation-not-allowed": "Email/password sign-in is not enabled. Please contact support.",
  "auth/expired-action-code": "This link has expired. Please request a new one.",
  "auth/invalid-action-code": "This link is invalid. Please request a new one.",
  "auth/requires-recent-login": "Please sign out and sign in again to continue.",
  "auth/account-exists-with-different-credential": "An account already exists with the same email but a different sign-in method.",
};

function fromFirebase(err: object & { code?: string }): string | null {
  if (!err.code || typeof err.code !== "string") return null;
  if (!err.code.startsWith("auth/")) return null;
  return FIREBASE_FRIENDLY[err.code] ?? null;
}

const CLERK_FRIENDLY: Record<string, string> = {
  form_identifier_not_found: "We couldn't find an account with that email.",
  form_password_incorrect: "That password doesn't match — please try again.",
  form_password_pwned: "This password has been seen in a data breach. Please pick a stronger one.",
  form_param_format_invalid: "Please check the format of what you typed.",
  form_param_nil: "Please fill in all the required fields.",
  form_identifier_exists: "An account with that email already exists. Try signing in instead.",
  too_many_requests: "Too many attempts — please wait a minute and try again.",
  verification_failed: "That code didn't match. Please try again.",
  verification_expired: "That code has expired. Please request a new one.",
  session_exists: "You're already signed in.",
  network_error: "We couldn't reach our servers. Please check your connection.",
};

function fromClerk(err: ClerkLikeError): string | null {
  const first = err.errors?.[0];
  if (!first) return null;
  if (first.code && CLERK_FRIENDLY[first.code]) return CLERK_FRIENDLY[first.code];
  // Fallback to longMessage/message but only if it looks like a sentence (no JSON, no stack).
  const msg = first.longMessage ?? first.message;
  if (msg && msg.length < 160 && !/[{}<>]/.test(msg)) return msg;
  return null;
}

function fromFetchStatus(status?: number): string | null {
  if (!status) return null;
  if (status === 401) return "Please sign in again to continue.";
  if (status === 403) return "You don't have access to that.";
  if (status === 404) return "We couldn't find what you were looking for.";
  if (status === 408 || status === 504) return "The request timed out — please try again.";
  if (status === 429) return "Slow down — too many requests. Please try again in a moment.";
  if (status >= 500) return "Something went wrong on our side. Please try again shortly.";
  if (status >= 400) return "We couldn't complete that — please try again.";
  return null;
}

/**
 * Convert any caught error into a short, parent-friendly sentence.
 * Always pair with `console.error` (or Sentry.captureException) for the raw error.
 *
 * @param err the caught error (any shape)
 * @param fallback message to use when nothing else fits (defaults to a generic apology)
 */
export function humanizeError(
  err: unknown,
  fallback = "Something didn't work — please try again.",
): string {
  if (err == null) return fallback;

  if (typeof err === "string") {
    return err.length < 160 && !/[{}<>]/.test(err) ? err : fallback;
  }

  if (typeof err === "object") {
    const e = err as ClerkLikeError & FetchLikeError & { code?: string };
    // Firebase errors take priority — they have a `code` like "auth/invalid-credential"
    const fromFirebaseMsg = fromFirebase(e);
    if (fromFirebaseMsg) return fromFirebaseMsg;
    const fromClerkMsg = fromClerk(e);
    if (fromClerkMsg) return fromClerkMsg;
    const fromStatus = fromFetchStatus(e.status);
    if (fromStatus) return fromStatus;
    if (typeof e.message === "string" && e.message.length < 160 && !/[{}<>]/.test(e.message)) {
      // Heuristic: low-level network errors should be friendlier.
      if (/network|fetch|failed to fetch|abort/i.test(e.message)) {
        return "We couldn't reach our servers. Please check your connection.";
      }
      return e.message;
    }
  }

  return fallback;
}
