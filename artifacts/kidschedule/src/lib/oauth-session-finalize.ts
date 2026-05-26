import { spaNavigateAfterSignIn } from "@/lib/auth-native-navigation";
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

const NATIVE_AUTH_CONTEXT_WAIT_MS = 8_000;
const WEB_AUTH_CONTEXT_WAIT_MS = 10_000;

/** Navigate after OAuth — SPA on Capacitor, full load on web when needed. */
export function navigateAfterOAuthSignIn(destination: string): void {
  if (typeof window === "undefined") return;
  const path = destination.startsWith("/") ? destination : `/${destination}`;
  if (isNativeAmyNestShell()) {
    spaNavigateAfterSignIn(path);
    return;
  }
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

function assertFirebaseSessionOrThrow(): void {
  refreshFirebaseAuthSnapshot();
  if (!getFirebaseAuth().currentUser) {
    throw Object.assign(
      new Error("Sign-in session could not be established. Please try again."),
      { code: "app/auth-session-lost" },
    );
  }
}

export async function finishOAuthLoginFlow(
  destination?: string,
): Promise<string> {
  const waitMs = isNativeAmyNestShell()
    ? NATIVE_AUTH_CONTEXT_WAIT_MS
    : WEB_AUTH_CONTEXT_WAIT_MS;

  refreshFirebaseAuthSnapshot();
  await waitForAuthContextAuthenticated(waitMs).catch(() => {
    refreshFirebaseAuthSnapshot();
  });
  assertFirebaseSessionOrThrow();

  let dest = destination;
  if (!dest) {
    try {
      dest = await resolvePostOAuthDestination();
    } catch {
      dest = "/dashboard";
    }
  }

  if (isNativeAmyNestShell()) {
    navigateAfterOAuthSignIn(dest);
  }
  return dest;
}
