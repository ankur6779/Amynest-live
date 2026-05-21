import { getRedirectResult, type UserCredential } from "firebase/auth";
import { logFirebaseAuthError } from "@/lib/firebase-auth-error";
import { getFirebaseAuth, isFirebaseAuthReady } from "@/lib/firebase";
import { isNativeAmyNestShell } from "@/lib/native-shell";

const OAUTH_TAG = "[amynest:oauth-redirect]";

let redirectResultConsumed = false;

/**
 * Completes Firebase `signInWithRedirect` for Apple, Google, or any OAuth provider.
 * Call once after Firebase init on web/PWA. No-op in native Capacitor shells.
 */
export async function resolveFirebaseAuthRedirectResult(): Promise<UserCredential | null> {
  if (typeof window === "undefined") return null;
  if (isNativeAmyNestShell()) return null;
  if (redirectResultConsumed) return null;
  if (!isFirebaseAuthReady()) return null;

  redirectResultConsumed = true;
  try {
    const result = await getRedirectResult(getFirebaseAuth());
    if (result?.user) {
      console.info(`${OAUTH_TAG} redirect sign-in success`, {
        uid: result.user.uid,
        provider: result.providerId ?? result.user.providerData[0]?.providerId,
      });
    }
    return result;
  } catch (err) {
    redirectResultConsumed = false;
    logFirebaseAuthError("oauth:redirect", err);
    throw err;
  }
}

/** Test-only reset */
export function resetFirebaseAuthRedirectConsumedForTests(): void {
  redirectResultConsumed = false;
}
