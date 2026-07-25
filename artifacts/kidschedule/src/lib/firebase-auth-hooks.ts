import { useContext, useSyncExternalStore } from "react";
import { AuthContext, type AuthContextValue, type ShimUser } from "./firebase-auth-context";
import {
  getLatestAuthSnapshot,
  hasUsableAuthSession,
  subscribeAuthSnapshot,
} from "./firebase-auth-listener";

function useCtx(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      "useAuth/useUser/useClerk must be used inside <FirebaseAuthProvider>",
    );
  }
  return ctx;
}

// ─── Clerk-compat hooks ────────────────────────────────────────────────────

export function useAuth(): {
  isLoaded: boolean;
  authStatus: AuthContextValue["authStatus"];
  isSignedIn: boolean;
  userId: string | null;
  sessionId: string | null;
  getToken: AuthContextValue["getToken"];
  signOut: AuthContextValue["signOut"];
} {
  const c = useCtx();
  const snapshotSignedIn = useSyncExternalStore(
    subscribeAuthSnapshot,
    () => {
      const snap = getLatestAuthSnapshot();
      return snap.authStatus === "authenticated" && snap.shim !== null;
    },
    () => false,
  );
  const isSignedIn =
    !!c.user || (c.isLoaded && (snapshotSignedIn || hasUsableAuthSession()));

  return {
    isLoaded: c.isLoaded,
    authStatus: c.authStatus,
    isSignedIn,
    userId: c.user?.id ?? null,
    sessionId: c.user?.id ?? null,
    getToken: c.getToken,
    signOut: c.signOut,
  };
}

function preferUserWithEmail(
  contextUser: ShimUser | null,
  snapshotUser: ShimUser | null,
): ShimUser | null {
  if (!contextUser) return snapshotUser;
  if (!snapshotUser) return contextUser;
  if (contextUser.id !== snapshotUser.id) return contextUser;
  const contextEmail = contextUser.primaryEmailAddress?.emailAddress;
  const snapshotEmail = snapshotUser.primaryEmailAddress?.emailAddress;
  // Context can lag when only the email field resolved after uid — prefer the
  // snapshot that already carries the allowlist identity.
  if (!contextEmail && snapshotEmail) return snapshotUser;
  return contextUser;
}

export function useUser(): {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: ShimUser | null;
} {
  const c = useCtx();
  const snapshotUser = useSyncExternalStore(
    subscribeAuthSnapshot,
    () => getLatestAuthSnapshot().shim,
    () => null,
  );
  const user = preferUserWithEmail(c.user, snapshotUser);
  const isSignedIn =
    !!user ||
    (c.isLoaded &&
      (getLatestAuthSnapshot().authStatus === "authenticated" || hasUsableAuthSession()));
  return { isLoaded: c.isLoaded, isSignedIn, user };
}

export function useClerk(): {
  signOut: AuthContextValue["signOut"];
  addListener: AuthContextValue["addListener"];
} {
  const c = useCtx();
  return { signOut: c.signOut, addListener: c.addListener };
}
