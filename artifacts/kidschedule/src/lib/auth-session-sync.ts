import { getFirebaseAuth } from "@/lib/firebase";
import {
  ensureFirebaseAuthListener,
  forceSyncAuthFromCurrentUser,
  getLatestAuthSnapshot,
} from "@/lib/firebase-auth-listener";
import { waitForAuthContextAuthenticated } from "@/lib/wait-for-auth-context";

const DEFAULT_SYNC_TIMEOUT_MS = 15_000;

/** Ensure Firebase user is reflected in React auth context before routing. */
export async function ensureAuthContextSynced(
  timeoutMs = DEFAULT_SYNC_TIMEOUT_MS,
): Promise<void> {
  ensureFirebaseAuthListener();
  forceSyncAuthFromCurrentUser();

  const snap = getLatestAuthSnapshot();
  if (snap.authStatus === "authenticated" && snap.shim) {
    return;
  }

  await waitForAuthContextAuthenticated(timeoutMs).catch(() => {
    forceSyncAuthFromCurrentUser();
  });

  const after = getLatestAuthSnapshot();
  if (after.authStatus === "authenticated" && after.shim) {
    return;
  }

  if (!getFirebaseAuth().currentUser) {
    throw Object.assign(
      new Error("Sign-in session could not be established. Please try again."),
      { code: "app/auth-session-lost" },
    );
  }

  forceSyncAuthFromCurrentUser();
}
