import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { onIdTokenChanged, signOut as fbSignOut } from "firebase/auth";
import { firebaseAuth } from "./firebase";
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

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoaded: false,
  });
  const listenersRef = useRef<Set<Listener>>(new Set());

  useEffect(() => {
    // Use onIdTokenChanged (not onAuthStateChanged) so token refreshes
    // don't get missed — getToken() always returns a fresh token via the
    // SDK cache.
    const unsub = onIdTokenChanged(firebaseAuth, (fbUser) => {
      const shim = fbUser ? fbToShim(fbUser as FirebaseUserLike) : null;
      setState({ user: shim, isLoaded: true });
      for (const l of listenersRef.current) {
        try {
          l({ user: shim });
        } catch {
          /* ignore listener errors */
        }
      }
    });

    return () => {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const getToken = useCallback(
    async (opts?: { skipCache?: boolean }): Promise<string | null> => {
      try {
        const u = firebaseAuth.currentUser;
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
      await fbSignOut(firebaseAuth);
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
  if (!isLoaded) return null;
  if (when === "signed-in" && isSignedIn) return <>{children}</>;
  if (when === "signed-out" && !isSignedIn) return <>{children}</>;
  return null;
}
