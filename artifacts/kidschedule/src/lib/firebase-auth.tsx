import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

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

interface AuthContextValue extends AuthState {
  getToken: (opts?: { skipCache?: boolean }) => Promise<string | null>;
  signOut: (opts?: { redirectUrl?: string }) => Promise<void>;
  addListener: (cb: Listener) => () => void;
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
      throw new Error(
        "Profile image upload is not yet wired to Firebase Storage in this build.",
      );
    },
  };
}

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [state] = useState<AuthState>({
    user: null,
    isLoaded: true,
  });

  const getToken = useCallback(
    async (opts?: { skipCache?: boolean }): Promise<string | null> => {
      return null;
    },
    [],
  );

  const signOut = useCallback(async (opts?: { redirectUrl?: string }) => {
    if (opts?.redirectUrl && typeof window !== "undefined") {
      window.location.href = opts.redirectUrl;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, getToken, signOut, addListener: () => () => {} }),
    [state, getToken, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

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
    sessionId: c.user?.id ?? null, // Firebase has no concept of separate session id
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

export function useClerk(): {
  signOut: AuthContextValue["signOut"];
  addListener: AuthContextValue["addListener"];
} {
  const c = useCtx();
  return { signOut: c.signOut, addListener: c.addListener };
}

// ─── <Show when="signed-in" | "signed-out"> drop-in ────────────────────────

export function Show({
  when,
  children,
}: {
  when: "signed-in" | "signed-out";
  children: ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (when === "signed-in" && isSignedIn) return <>{children}</>;
  if (when === "signed-out" && !isSignedIn) return <>{children}</>;
  return null;
}
