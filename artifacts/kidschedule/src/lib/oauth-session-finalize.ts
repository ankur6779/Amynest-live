import {
  ensureFirebaseAuthPersistence,
  getFirebaseAuth,
} from "@/lib/firebase";
import { refreshFirebaseAuthSnapshot } from "@/lib/firebase-auth-listener";
import { resolvePostOAuthDestination } from "@/lib/post-verify-destination";
import { waitForAuthContextAuthenticated } from "@/lib/wait-for-auth-context";
import { waitForFirebaseUser } from "@/lib/wait-for-firebase-user";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import type { User, UserCredential } from "firebase/auth";

/** Hard navigation after OAuth so route guards see persisted Firebase auth. */
export function navigateAfterOAuthSignIn(destination: string): void {
  if (typeof window === "undefined") return;
  const path = destination.startsWith("/") ? destination : `/${destination}`;
  window.location.assign(`${window.location.origin}${path}`);
}

export async function finalizeOAuthCredentialSignIn(
  result: UserCredential,
): Promise<User> {
  await ensureFirebaseAuthPersistence();
  await result.user.getIdToken(true);
  refreshFirebaseAuthSnapshot();
  const user = (await waitForFirebaseUser(10_000)) ?? result.user;
  await waitForAuthContextAuthenticated(10_000).catch(() => {
    refreshFirebaseAuthSnapshot();
  });
  if (!getFirebaseAuth().currentUser) {
    throw Object.assign(
      new Error("Sign-in session could not be established. Please try again."),
      { code: "app/auth-session-lost" },
    );
  }
  return user;
}

export async function finishOAuthLoginFlow(
  destination?: string,
): Promise<string> {
  await waitForAuthContextAuthenticated(10_000);
  const dest = destination ?? (await resolvePostOAuthDestination());
  if (isNativeAmyNestShell()) {
    navigateAfterOAuthSignIn(dest);
  }
  return dest;
}
