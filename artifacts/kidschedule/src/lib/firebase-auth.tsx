import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut as fbSignOut, type User as FbUser } from "firebase/auth";
import { getFirebaseAuth } from "./firebase";
import {
  AuthContext,
  type AuthContextValue,
  type AuthResolutionStatus,
  type AuthState,
  type Listener,
  type ShimUser,
} from "./firebase-auth-context";
import { patchBootDiagnostics, recordBootError } from "@/lib/boot-store";
import { RouteLoadingShell } from "@/components/route-loading-shell";

const AUTH_TAG = "[amynest:firebase-auth]";
const AUTH_RACE_TIMEOUT_MS = 10_000;

type FirebaseUserLike = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
};

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

function waitForAuthStateChanged(auth: ReturnType<typeof getFirebaseAuth>): Promise<FbUser | null> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      try {
        unsub();
      } catch {
        /* ignore */
      }
      resolve(user);
    });
  });
}

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    toAuthState(null, "loading"),
  );
  const listenersRef = useRef<Set<Listener>>(new Set());
  const resolvedRef = useRef(false);

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

    console.info(`${AUTH_TAG} auth resolved`, { authStatus, uid, email: shim?.primaryEmailAddress?.emailAddress });

    for (const l of listenersRef.current) {
      try {
        l({ user: shim });
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    resolvedRef.current = false;

    let auth: ReturnType<typeof getFirebaseAuth>;
    try {
      auth = getFirebaseAuth();
    } catch (err) {
      recordBootError("getFirebaseAuth", err);
      publish(null, "timeout");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (cancelled || resolvedRef.current) return;
      resolvedRef.current = true;
      console.warn(`${AUTH_TAG} auth race timeout (${AUTH_RACE_TIMEOUT_MS}ms)`);
      publish(null, "timeout");
    }, AUTH_RACE_TIMEOUT_MS);

    void waitForAuthStateChanged(auth)
      .then((fbUser) => {
        if (cancelled || resolvedRef.current) return;
        resolvedRef.current = true;
        window.clearTimeout(timeoutId);
        const shim = buildShimFromFirebaseUser(fbUser);
        publish(shim, shim ? "authenticated" : "unauthenticated");
      })
      .catch((err) => {
        if (cancelled || resolvedRef.current) return;
        resolvedRef.current = true;
        window.clearTimeout(timeoutId);
        recordBootError("onAuthStateChanged", err);
        publish(null, "timeout");
      });

    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (!resolvedRef.current) return;
      const shim = buildShimFromFirebaseUser(fbUser);
      publish(shim, shim ? "authenticated" : "unauthenticated");
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      try {
        unsub();
      } catch {
        /* ignore */
      }
    };
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
