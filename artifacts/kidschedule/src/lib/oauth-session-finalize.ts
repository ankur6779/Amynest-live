import { navigateAfterAuth } from "@/lib/auth-navigation";
import { ensureAuthContextSynced } from "@/lib/auth-session-sync";
import {
  ensureFirebaseAuthPersistence,
  getFirebaseAuth,
} from "@/lib/firebase";
import { refreshFirebaseAuthSnapshot } from "@/lib/firebase-auth-listener";
import { resolvePostOAuthDestination } from "@/lib/post-verify-destination";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import type { User, UserCredential } from "firebase/auth";

const NATIVE_SYNC_TIMEOUT_MS = 15_000;
const WEB_SYNC_TIMEOUT_MS = 10_000;

/** @deprecated Use navigateAfterAuth */
export function navigateAfterOAuthSignIn(destination: string): void {
  navigateAfterAuth(destination);
}

export async function finalizeOAuthCredentialSignIn(
  result: UserCredential,
): Promise<User> {
  await ensureFirebaseAuthPersistence();
  await result.user.getIdToken(true);
  refreshFirebaseAuthSnapshot();
  await ensureAuthContextSynced(
    isNativeAmyNestShell() ? NATIVE_SYNC_TIMEOUT_MS : WEB_SYNC_TIMEOUT_MS,
  );
  if (!getFirebaseAuth().currentUser) {
    throw Object.assign(
      new Error("Sign-in session could not be established. Please try again."),
      { code: "app/auth-session-lost" },
    );
  }
  return result.user;
}

export async function finishOAuthLoginFlow(
  destination?: string,
): Promise<string> {
  await ensureAuthContextSynced(
    isNativeAmyNestShell() ? NATIVE_SYNC_TIMEOUT_MS : WEB_SYNC_TIMEOUT_MS,
  );

  let dest = destination;
  if (!dest) {
    try {
      dest = await Promise.race([
        resolvePostOAuthDestination(),
        new Promise<string>((resolve) => {
          window.setTimeout(() => resolve("/dashboard"), 5_000);
        }),
      ]);
    } catch {
      dest = "/dashboard";
    }
  }

  navigateAfterAuth(dest);
  return dest;
}
