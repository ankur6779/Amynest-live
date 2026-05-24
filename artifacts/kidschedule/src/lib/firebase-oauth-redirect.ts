import { getRedirectResult, type UserCredential } from "firebase/auth";
import { logFirebaseAuthError } from "@/lib/firebase-auth-error";
import { getFirebaseAuth, isFirebaseAuthReady } from "@/lib/firebase";
import { isNativeAmyNestShell } from "@/lib/native-shell";

const OAUTH_TAG = "[amynest:oauth-redirect]";

let redirectResultConsumed = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Firebase stores redirect state in sessionStorage while the OAuth round-trip is in flight. */
export function hasPendingFirebaseOAuthRedirect(): boolean {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i) ?? "";
      if (
        key.includes("redirectEvent") ||
        key.includes("authEvent") ||
        key.startsWith("firebase:redirect")
      ) {
        return true;
      }
    }
  } catch {
    /* ignore */
  }
  const hash = window.location.hash;
  const search = window.location.search;
  return (
    hash.includes("apiKey=") ||
    hash.includes("access_token=") ||
    search.includes("apiKey=") ||
    search.includes("authType=")
  );
}

async function readRedirectResultOnce(): Promise<UserCredential | null> {
  if (!isFirebaseAuthReady()) return null;
  const result = await getRedirectResult(getFirebaseAuth());
  if (result?.user) {
    console.info(`${OAUTH_TAG} redirect sign-in success`, {
      uid: result.user.uid,
      provider: result.providerId ?? result.user.providerData[0]?.providerId,
    });
  }
  return result;
}

/**
 * Completes Firebase `signInWithRedirect` for Apple, Google, or any OAuth provider.
 * Retries while Firebase init / redirect state catches up (browser only).
 */
export async function resolveFirebaseAuthRedirectResult(): Promise<UserCredential | null> {
  if (typeof window === "undefined") return null;
  if (isNativeAmyNestShell()) return null;
  if (redirectResultConsumed) return null;

  const pending = hasPendingFirebaseOAuthRedirect();
  const maxWaitMs = pending ? 12_000 : 2_000;
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    if (!isFirebaseAuthReady()) {
      await sleep(120);
      continue;
    }
    try {
      const result = await readRedirectResultOnce();
      redirectResultConsumed = true;
      return result;
    } catch (err) {
      redirectResultConsumed = false;
      logFirebaseAuthError("oauth:redirect", err);
      throw err;
    }
  }

  if (pending) {
    console.warn(`${OAUTH_TAG} redirect pending but getRedirectResult returned null`);
  }
  redirectResultConsumed = true;
  return null;
}

/** Test-only reset */
export function resetFirebaseAuthRedirectConsumedForTests(): void {
  redirectResultConsumed = false;
}
