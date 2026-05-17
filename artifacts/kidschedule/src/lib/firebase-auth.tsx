import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  onIdTokenChanged,
  signOut as fbSignOut,
  type User as FbUser,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";

const AUTH_TAG = "[amynest:firebase-auth]";
const AUTH_READY_TIMEOUT_MS = 12_000;
import {
  AuthContext,
  type AuthContextValue,
  type AuthState,
  type Listener,
  type ShimUser,
} from "./firebase-auth-context";

// All firebase modules ("firebase/app", "firebase/auth") are listed in
// vite.config.ts -> optimizeDeps.include, so they're pre-bundled at startup
// alongside React. Static imports here ensure:
//   1. The dependency graph is fully known when the dev server starts, so
//      Vite never needs to re-bundle deps mid-session (a re-bundle changes
//      the `?v=` cache-bust hash, which would create two ESM React instances
//      in the browser — the cause of the recurring "Invalid hook call" /
//      "more than one copy of React" crash this file used to suffer from).
//   2. ESM resolves all static imports before this module executes, so there
//      is no chunk-load race with React's internals.
// Do NOT convert these back to dynamic imports — that re-introduces the
// mid-session dep-discovery → re-bundle → hash-mismatch crash loop.

type FirebaseUserLike = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
};

/**
 * A Clerk-shaped wrapper around Firebase Auth. Lets the existing app keep
 * its `useAuth() / useUser() / useClerk()` call sites unchanged after the
 * migration.
 *
 * Mapping
 *   Clerk user.id                 → Firebase user.uid
 *   user.firstName / lastName     → split from displayName
 *   user.fullName                 → displayName
 *   user.imageUrl                 → photoURL
 *   user.emailAddresses[0].e..    → email (single entry)
 *   user.primaryEmailAddress      → { emailAddress: email }
 *
 * The context object, value type, and shim user types live in
 * `./firebase-auth-context` so this file can stay a clean Fast Refresh
 * boundary that exports ONLY components.
 */

function fbToShim(u: FirebaseUserLike): ShimUser {
  const display = u.displayName ?? "";
  const [first, ...rest] = display.split(" ");
  const last = rest.join(" ");
  const email = u.email ?? null;
  return {
    id: u.uid,
    uid: u.uid,
    firstName: first || null,
    lastName: last || null,
    fullName: display || null,
    imageUrl: u.photoURL ?? null,
    emailAddresses: email ? [{ emailAddress: email }] : [],
    primaryEmailAddress: email ? { emailAddress: email } : null,
    primaryPhoneNumber: u.phoneNumber ? { phoneNumber: u.phoneNumber } : null,
    setProfileImage: async () => {
      throw new Error(
        "Profile image upload is not yet wired to Firebase Storage in this build.",
      );
    },
  };
}

function buildShimFromFirebaseUser(fbUser: FbUser | null): ShimUser | null {
  const VERIFICATION_BYPASS_EMAILS = new Set([
    "demo@amynest.in",
    "googleplay.reviewer@amynest.app",
  ]);
  const bypassEmail =
    fbUser?.email != null &&
    VERIFICATION_BYPASS_EMAILS.has(fbUser.email.toLowerCase().trim());
  const isUnverifiedEmailUser =
    fbUser !== null &&
    !fbUser.emailVerified &&
    !bypassEmail &&
    fbUser.providerData.every((p) => p.providerId === "password");
  return fbUser && !isUnverifiedEmailUser ? fbToShim(fbUser as FirebaseUserLike) : null;
}

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoaded: false,
  });
  const listenersRef = useRef<Set<Listener>>(new Set());
  const lastUidRef = useRef<string | null | undefined>(undefined);

  const applyAuthUser = useCallback((fbUser: FbUser | null, source: string) => {
    const shim = buildShimFromFirebaseUser(fbUser);
    const uid = shim?.id ?? null;
    setState((prev) => {
      if (prev.isLoaded && (prev.user?.id ?? null) === uid) return prev;
      return { user: shim, isLoaded: true };
    });
    if (lastUidRef.current !== uid) {
      console.info(`${AUTH_TAG} Auth state (${source})`, {
        signedIn: Boolean(shim),
        uid,
        email: fbUser?.email ?? null,
      });
      lastUidRef.current = uid;
    }
    for (const l of listenersRef.current) {
      try {
        l({ user: shim });
      } catch {
        /* ignore listener errors */
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let auth: ReturnType<typeof getFirebaseAuth>;

    try {
      auth = getFirebaseAuth();
    } catch (err) {
      console.error(`${AUTH_TAG} getFirebaseAuth failed`, err);
      setState({ user: null, isLoaded: true });
      return;
    }

    const readyTimeout = window.setTimeout(() => {
      if (cancelled) return;
      console.warn(`${AUTH_TAG} authStateReady timeout — continuing as signed-out`);
      setState((prev) => (prev.isLoaded ? prev : { user: null, isLoaded: true }));
    }, AUTH_READY_TIMEOUT_MS);

    void auth.authStateReady().then(() => {
      if (cancelled) return;
      window.clearTimeout(readyTimeout);
      console.info(`${AUTH_TAG} authStateReady`, {
        hasUser: Boolean(auth.currentUser),
      });
      applyAuthUser(auth.currentUser, "authStateReady");
    }).catch((err) => {
      console.error(`${AUTH_TAG} authStateReady failed`, err);
      if (!cancelled) {
        setState({ user: null, isLoaded: true });
      }
    });

    const unsub = onIdTokenChanged(auth, (fbUser) => {
      if (cancelled) return;
      window.clearTimeout(readyTimeout);
      applyAuthUser(fbUser, "onIdTokenChanged");
    });

    return () => {
      cancelled = true;
      window.clearTimeout(readyTimeout);
      try {
        unsub();
      } catch {
        /* ignore */
      }
    };
  }, [applyAuthUser]);

  const getToken = useCallback(
    async (opts?: { skipCache?: boolean }): Promise<string | null> => {
      try {
        const u = getFirebaseAuth().currentUser;
        if (!u) return null;
        return await u.getIdToken(opts?.skipCache === true);
      } catch {
        return null;
      }
    },
    [],
  );

  const signOut = useCallback(async (opts?: { redirectUrl?: string }) => {
    try {
      await fbSignOut(getFirebaseAuth());
    } catch (err) {
      console.error("[firebase-auth] signOut failed:", err);
    }
    if (opts?.redirectUrl && typeof window !== "undefined") {
      window.location.href = opts.redirectUrl;
    }
  }, []);

  const addListener = useCallback((cb: Listener) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, getToken, signOut, addListener }),
    [state, getToken, signOut, addListener],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── <Show when="signed-in" | "signed-out"> drop-in ────────────────────────

export function Show({
  when,
  children,
}: {
  when: "signed-in" | "signed-out";
  children: ReactNode;
}) {
  const ctx = useContext(AuthContext);
  const isLoaded = ctx?.isLoaded ?? false;
  const isSignedIn = !!ctx?.user;
  if (!isLoaded) {
    return null;
  }
  if (when === "signed-in" && isSignedIn) return <>{children}</>;
  if (when === "signed-out" && !isSignedIn) return <>{children}</>;
  return null;
}
