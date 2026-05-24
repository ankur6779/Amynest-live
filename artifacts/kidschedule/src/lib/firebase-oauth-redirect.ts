import { getRedirectResult, type User, type UserCredential } from "firebase/auth";
import { logFirebaseAuthError } from "@/lib/firebase-auth-error";
import {
  ensureFirebaseAuthPersistence,
  getFirebaseAuth,
  isFirebaseAuthReady,
} from "@/lib/firebase";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import { waitForFirebaseAuthReady } from "@/lib/wait-for-firebase-auth-ready";
import { waitForFirebaseUser } from "@/lib/wait-for-firebase-user";

const OAUTH_TAG = "[amynest:oauth-redirect]";

let redirectResultPromise: Promise<UserCredential | null> | null = null;
let redirectResolutionInFlight = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getFirebaseAuthErrorCode(err: unknown): string | undefined {
  return (err as { code?: string })?.code;
}

function listFirebaseSessionKeys(): string[] {
  if (typeof window === "undefined") return [];
  const keys: string[] = [];
  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i) ?? "";
      if (key.startsWith("firebase:")) keys.push(key);
    }
  } catch {
    /* ignore */
  }
  return keys;
}

function mayBeOAuthReturn(): boolean {
  if (typeof window === "undefined") return false;
  const ref = document.referrer || "";
  if (!/accounts\.google\.com|firebaseapp\.com|googleusercontent/i.test(ref)) {
    return false;
  }
  const hash = window.location.hash;
  const search = window.location.search;
  if (
    hash.includes("apiKey=") ||
    hash.includes("access_token=") ||
    search.includes("apiKey=") ||
    search.includes("authType=") ||
    search.includes("code=")
  ) {
    return true;
  }
  return listFirebaseSessionKeys().some((key) =>
    /pendingRedirect|redirectEvent/i.test(key),
  );
}

/** Firebase stores redirect state in sessionStorage while the OAuth round-trip is in flight. */
export function hasPendingFirebaseOAuthRedirect(): boolean {
  if (typeof window === "undefined") return false;

  const firebaseKeys = listFirebaseSessionKeys();
  if (
    firebaseKeys.some((key) =>
      /pendingRedirect|redirectEvent|authEvent/i.test(key),
    )
  ) {
    return true;
  }

  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i) ?? "";
      if (
        key.includes("redirectEvent") ||
        key.includes("authEvent") ||
        key.startsWith("firebase:redirect") ||
        key.includes("pendingRedirect")
      ) {
        return true;
      }
    }
  } catch {
    /* ignore */
  }

  const hash = window.location.hash;
  const search = window.location.search;
  if (
    hash.includes("apiKey=") ||
    hash.includes("access_token=") ||
    search.includes("apiKey=") ||
    search.includes("authType=")
  ) {
    return true;
  }

  return mayBeOAuthReturn();
}

export function isFirebaseOAuthRedirectResolving(): boolean {
  return redirectResolutionInFlight;
}

async function waitForFirebaseInit(maxWaitMs: number): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (isFirebaseAuthReady()) return true;
    await sleep(120);
  }
  return isFirebaseAuthReady();
}

function userCredentialFromUser(user: User): UserCredential {
  const providerId = user.providerData[0]?.providerId ?? null;
  return {
    user,
    providerId,
    operationType: "signIn",
  };
}

async function completeFirebaseAuthRedirectResult(): Promise<UserCredential | null> {
  const pending = hasPendingFirebaseOAuthRedirect();
  if (!pending) {
    return null;
  }

  const maxWaitMs = 15_000;

  console.info(`${OAUTH_TAG} resolving redirect`, {
    pending,
    href: window.location.href,
    referrer: typeof document !== "undefined" ? document.referrer : "",
    firebaseSessionKeys: listFirebaseSessionKeys(),
  });

  redirectResolutionInFlight = true;

  try {
    if (!(await waitForFirebaseInit(maxWaitMs))) {
      console.warn(`${OAUTH_TAG} Firebase not ready before redirect completion`);
      return null;
    }

    const auth = getFirebaseAuth();
    await ensureFirebaseAuthPersistence();
    await waitForFirebaseAuthReady(auth);
    await sleep(200);

    let result: UserCredential | null = null;
    try {
      result = await getRedirectResult(auth);
    } catch (err) {
      const code = getFirebaseAuthErrorCode(err);
      if (code === "auth/argument-error") {
        console.warn(
          `${OAUTH_TAG} getRedirectResult argument-error — retrying via auth state`,
          err,
        );
      } else {
        throw err;
      }
    }

    if (result?.user) {
      console.info(`${OAUTH_TAG} redirect sign-in success`, {
        uid: result.user.uid,
        provider: result.providerId ?? result.user.providerData[0]?.providerId,
      });
      return result;
    }

    console.warn(
      `${OAUTH_TAG} getRedirectResult returned null — waiting for auth state`,
    );
    const user =
      (await waitForFirebaseUser(8_000)) ?? auth.currentUser ?? null;
    if (user) {
      console.info(`${OAUTH_TAG} redirect recovered via auth state`, {
        uid: user.uid,
      });
      return userCredentialFromUser(user);
    }

    console.warn(`${OAUTH_TAG} redirect pending but no Firebase user established`);
    return null;
  } catch (err) {
    logFirebaseAuthError("oauth:redirect", err);
    return null;
  } finally {
    redirectResolutionInFlight = false;
  }
}

/**
 * Completes Firebase `signInWithRedirect` for Apple, Google, or any OAuth provider.
 * Must call getRedirectResult exactly once after authStateReady (browser only).
 */
export function resolveFirebaseAuthRedirectResult(): Promise<UserCredential | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (isNativeAmyNestShell()) return Promise.resolve(null);

  if (!redirectResultPromise) {
    redirectResultPromise = completeFirebaseAuthRedirectResult();
  }
  return redirectResultPromise;
}

/** Start redirect resolution as early as possible — right after Firebase init. */
export function beginFirebaseOAuthRedirectResolution(): void {
  if (typeof window === "undefined") return;
  if (isNativeAmyNestShell()) return;
  if (!hasPendingFirebaseOAuthRedirect()) return;
  void resolveFirebaseAuthRedirectResult().catch((err) => {
    console.warn(`${OAUTH_TAG} early redirect resolution failed`, err);
  });
}

/** Test-only reset */
export function resetFirebaseAuthRedirectConsumedForTests(): void {
  redirectResultPromise = null;
  redirectResolutionInFlight = false;
}
