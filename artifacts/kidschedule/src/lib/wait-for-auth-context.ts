import {
  getLatestAuthSnapshot,
  refreshFirebaseAuthSnapshot,
  subscribeAuthSnapshot,
} from "@/lib/firebase-auth-listener";
import { getFirebaseAuth } from "@/lib/firebase";

/** Wait until React auth context reflects a signed-in Firebase user. */
export function waitForAuthContextAuthenticated(
  timeoutMs = 15_000,
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const snap = getLatestAuthSnapshot();
  if (snap.authStatus === "authenticated" && snap.shim) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      unsub();
      if (getFirebaseAuth().currentUser) {
        refreshFirebaseAuthSnapshot();
        const retry = getLatestAuthSnapshot();
        if (retry.authStatus === "authenticated" && retry.shim) {
          resolve();
          return;
        }
      }
      reject(
        Object.assign(new Error("Sign-in session could not be established."), {
          code: "app/auth-session-lost",
        }),
      );
    }, timeoutMs);

    const unsub = subscribeAuthSnapshot(({ shim, authStatus }) => {
      if (authStatus === "authenticated" && shim) {
        clearTimeout(timer);
        unsub();
        resolve();
        return;
      }
      if (getFirebaseAuth().currentUser) {
        refreshFirebaseAuthSnapshot();
      }
    });
  });
}
