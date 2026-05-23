import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  onIdTokenChanged,
  signOut as fbSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { firebaseAuth } from "./firebase";

/**
 * Mobile twin of the kidschedule shim. Same Clerk-shaped API so call sites
 * already written against `@clerk/clerk-expo` keep working with only the
 * import path swapped.
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
  /** Stub so call sites compile; no-op in mobile (no Firebase Storage wired). */
  setProfileImage: (args: { file: unknown }) => Promise<void>;
}

interface AuthState {
  user: ShimUser | null;
  fbUser: FirebaseUser | null;
  isLoaded: boolean;
}

interface AuthContextValue extends AuthState {
  getToken: (opts?: { skipCache?: boolean }) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function fbToShim(u: FirebaseUser): ShimUser {
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
      throw new Error("Profile image upload is not yet wired on mobile.");
    },
  };
}

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    fbUser: null,
    isLoaded: false,
  });

  useEffect(() => {
    const unsub = onIdTokenChanged(firebaseAuth, (fbUser) => {
      const shim = fbUser ? fbToShim(fbUser) : null;
      setState({ user: shim, fbUser, isLoaded: true });
    });
    return unsub;
  }, []);

  // Always delegate to the Firebase SDK's own token cache: getIdToken(false)
  // returns the cached token if still valid and transparently refreshes when
  // it's near expiry. Keeping our own ref'd copy was causing stale-token 401s.
  const getToken = useCallback(
    async (opts?: { skipCache?: boolean }): Promise<string | null> => {
      const u = firebaseAuth.currentUser;
      if (!u) return null;
      try {
        return await u.getIdToken(opts?.skipCache === true);
      } catch {
        return null;
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    await fbSignOut(firebaseAuth);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, getToken, signOut }),
    [state, getToken, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useCtx(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      "useAuth/useUser must be used inside <FirebaseAuthProvider>",
    );
  }
  return ctx;
}

export function useAuth(): {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  sessionId: string | null;
  getToken: AuthContextValue["getToken"];
  signOut: AuthContextValue["signOut"];
} {
  const c = useCtx();
  return {
    isLoaded: c.isLoaded,
    isSignedIn: !!c.user,
    userId: c.user?.id ?? null,
    sessionId: c.user?.id ?? null,
    getToken: c.getToken,
    signOut: c.signOut,
  };
}

export function useUser(): {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: ShimUser | null;
} {
  const c = useCtx();
  return { isLoaded: c.isLoaded, isSignedIn: !!c.user, user: c.user };
}
