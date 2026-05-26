/**
 * Hard timeout wrapper for Firebase Auth network calls.
 *
 * Why this exists: on Capacitor iOS (WKWebView) the Firebase JS SDK has been
 * observed to hang indefinitely when a fetch to identitytoolkit.googleapis.com
 * stalls — neither resolving nor rejecting. Without a timeout, the sign-in /
 * sign-up button stays in its "Signing in…" state forever and the user has no
 * way to recover or to see what went wrong.
 *
 * We wrap the auth promise in a Promise.race with a 30 s timer so the user
 * always sees either a success path or a clear error toast.
 */

import { isNativeAmyNestShell } from "@/lib/native-shell";

export const DEFAULT_AUTH_TIMEOUT_MS = isNativeAmyNestShell() ? 30_000 : 20_000;

export class AuthTimeoutError extends Error {
  readonly code = "app/auth-network-timeout";
  constructor(message?: string) {
    super(
      message ??
        "Sign-in is taking longer than usual. Check your internet connection and try again.",
    );
    this.name = "AuthTimeoutError";
  }
}

/**
 * Race a promise against a timeout. If the promise wins, its value is
 * returned. If the timer wins, the wrapper rejects with an AuthTimeoutError.
 *
 * NOTE: this does NOT cancel the underlying promise (Firebase JS SDK has no
 * AbortSignal support for auth calls) — but it does free the UI so the user
 * can retry. Any late resolution from the original promise is ignored.
 */
export async function withAuthTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs: number = DEFAULT_AUTH_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      console.warn(
        `[amynest:auth-timeout] ${label} did not respond within ${timeoutMs}ms`,
      );
      reject(new AuthTimeoutError());
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}
