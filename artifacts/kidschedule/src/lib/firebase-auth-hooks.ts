import { useContext } from "react";
import { AuthContext, type AuthContextValue, type ShimUser } from "./firebase-auth-context";

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

export function useClerk(): {
  signOut: AuthContextValue["signOut"];
  addListener: AuthContextValue["addListener"];
} {
  const c = useCtx();
  return { signOut: c.signOut, addListener: c.addListener };
}
