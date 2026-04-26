import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// IMPORTANT: do NOT statically import "firebase/auth" or "./firebase" here.
//
// Why: in dev, Vite pre-bundles `firebase/auth` as a separate optimized
// dependency. When this module's static graph pulls firebase/auth alongside
// React, the chunk-load order can race React 19's internal dispatcher setup
// and cause `useState` to throw "Cannot read properties of null" on first
// render (React reports this as the misleading "more than one copy of React"
// warning).
//
// Keeping all firebase access behind dynamic `import()` inside effects /
// callbacks means this module's static dependency graph is just React, which
// eliminates the race entirely.

type LoadedAuth = typeof import("./firebase");
type FirebaseUserLike = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
};

let firebaseModulePromise: Promise<LoadedAuth> | null = null;
function loadFirebase(): Promise<LoadedAuth> {
  if (!firebaseModulePromise) {
    firebaseModulePromise = import("./firebase");
  }
  return firebaseModulePromise;
}

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
 */

export interface ShimEmailAddress {
  emailAddress: string;
}

export interface ShimUser {
  id: string;
  uid: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  imageUrl: string | null;
  emailAddresses: ShimEmailAddress[];
  primaryEmailAddress: ShimEmailAddress | null;
  primaryPhoneNumber: { phoneNumber: string } | null;
  /** Stub — Firebase Auth alone can't host avatars. */
  setProfileImage: (args: { file: File }) => Promise<void>;
}

interface AuthState {
  user: ShimUser | null;
  isLoaded: boolean;
}

type Listener = (snapshot: { user: ShimUser | null }) => void;

export interface AuthContextValue extends AuthState {
  getToken: (opts?: { skipCache?: boolean }) => Promise<string | null>;
  signOut: (opts?: { redirectUrl?: string }) => Promise<void>;
  addListener: (cb: Listener) => () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

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
    let cancelled = false;
    let unsub: () => void = () => {};

    void (async () => {
      try {
        const [{ firebaseAuth }, authMod] = await Promise.all([
          loadFirebase(),
          import("firebase/auth"),
        ]);
        if (cancelled) return;

        // Use onIdTokenChanged (not onAuthStateChanged) so token refreshes
        // don't get missed — getToken() always returns a fresh token via the
        // SDK cache.
        unsub = authMod.onIdTokenChanged(firebaseAuth, (fbUser) => {
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
      } catch (err) {
        // If firebase fails to load (bad config, network, etc.), still mark
        // the provider as loaded with no user so the UI can render the
        // signed-out state instead of hanging on a spinner forever.
        console.error("[firebase-auth] failed to initialize:", err);
        if (!cancelled) {
          setState({ user: null, isLoaded: true });
        }
      }
    })();

    return () => {
      cancelled = true;
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
        const { firebaseAuth } = await loadFirebase();
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
      const [{ firebaseAuth }, authMod] = await Promise.all([
        loadFirebase(),
        import("firebase/auth"),
      ]);
      await authMod.signOut(firebaseAuth);
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
