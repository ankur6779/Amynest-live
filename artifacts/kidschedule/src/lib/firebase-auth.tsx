import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { signOut as fbSignOut } from "firebase/auth";
import { getFirebaseAuth } from "./firebase";
import {
  AuthContext,
  type AuthContextValue,
  type AuthResolutionStatus,
  type AuthState,
  type Listener,
  type ShimUser,
} from "./firebase-auth-context";
import { patchBootDiagnostics } from "@/lib/boot-store";
import { RouteLoadingShell } from "@/components/route-loading-shell";
import {
  ensureFirebaseAuthListener,
  subscribeAuthSnapshot,
} from "./firebase-auth-listener";
import { resetOnboardingFetchLock } from "./onboarding-status-fetch";
import { resetNativeBillingIdentity } from "@/lib/native-billing";

const AUTH_TAG = "[amynest:firebase-auth]";

function toAuthState(
  shim: ShimUser | null,
  authStatus: AuthResolutionStatus,
): AuthState {
  const isLoaded = authStatus !== "loading";
  return {
    user: shim,
    isLoaded,
    authStatus,
  };
}

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    toAuthState(null, "loading"),
  );
  const listenersRef = useRef<Set<Listener>>(new Set());

  const publish = useCallback((shim: ShimUser | null, authStatus: AuthResolutionStatus) => {
    const uid = shim?.id ?? null;
    const isLoaded = authStatus !== "loading";
    setState((prev) => {
      if (
        prev.authStatus === authStatus &&
        (prev.user?.id ?? null) === uid &&
        prev.isLoaded === isLoaded
      ) {
        return prev;
      }
      return toAuthState(shim, authStatus);
    });

    if (authStatus === "unauthenticated" || authStatus === "timeout") {
      resetOnboardingFetchLock();
    }

    patchBootDiagnostics({
      authStatus:
        authStatus === "authenticated"
          ? "authenticated"
          : authStatus === "timeout"
            ? "timeout"
            : authStatus === "loading"
              ? "loading"
              : "unauthenticated",
      authUserLabel: uid ?? "null",
    });

    console.info(`${AUTH_TAG} auth resolved`, {
      authStatus,
      uid,
      email: shim?.primaryEmailAddress?.emailAddress,
    });

    for (const l of listenersRef.current) {
      try {
        l({ user: shim });
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    ensureFirebaseAuthListener();
    const unsubscribe = subscribeAuthSnapshot(({ shim, authStatus }) => {
      publish(shim, authStatus);
    });
    return unsubscribe;
  }, [publish]);

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
    // Reset RevenueCat to anonymous so a different account signing in on this
    // device cannot inherit the previous user's premium entitlements. Fire and
    // forget — never block sign-out on the billing bridge.
    void resetNativeBillingIdentity();
    resetOnboardingFetchLock();
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

export function Show({
  when,
  children,
}: {
  when: "signed-in" | "signed-out";
  children: ReactNode;
}) {
  const ctx = useContext(AuthContext);
  const authStatus = ctx?.authStatus ?? "loading";
  const isSignedIn = !!ctx?.user;

  if (authStatus === "loading") {
    return <RouteLoadingShell />;
  }

  if (when === "signed-in" && isSignedIn) return <>{children}</>;
  if (when === "signed-out" && !isSignedIn) return <>{children}</>;

  return <span aria-hidden style={{ display: "none" }} />;
}
