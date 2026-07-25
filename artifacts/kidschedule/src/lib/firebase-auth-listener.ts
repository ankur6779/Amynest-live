import { onAuthStateChanged, type User as FbUser } from "firebase/auth";
import { getFirebaseAuth } from "./firebase";
import type { AuthResolutionStatus, ShimUser } from "./firebase-auth-context";
import { recordBootError } from "@/lib/boot-store";
import { isEmailVerificationBypassEmail } from "./email-verification-bypass";
import { devLog } from "@/lib/dev-log";
import { isFirebaseOAuthRedirectResolving } from "@/lib/firebase-oauth-redirect";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import { trackStartupFunnel, trackStartupFunnelFailure } from "@/lib/startup-funnel";
import { setBirthSkyViewerEmail } from "@/features/birth-sky/lib/feature-flags";

const AUTH_TAG = "[amynest:firebase-auth]";
const AUTH_RACE_TIMEOUT_MS = isNativeAmyNestShell() ? 25_000 : 10_000;

export type AuthSnapshot = {
  shim: ShimUser | null;
  authStatus: AuthResolutionStatus;
};

type SnapshotListener = (snapshot: AuthSnapshot) => void;

let latestSnapshot: AuthSnapshot = { shim: null, authStatus: "loading" };
let listenerAttached = false;
let firstAuthEventReceived = false;
let raceTimeoutId: ReturnType<typeof setTimeout> | null = null;
const snapshotListeners = new Set<SnapshotListener>();
let authFinishedTracked = false;

type FirebaseUserLike = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  isAnonymous?: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
};

function resolveFirebaseUserEmail(
  fbUser: FbUser | null | undefined,
): string | null {
  if (!fbUser) return null;
  if (fbUser.email) return fbUser.email;
  for (const provider of fbUser.providerData) {
    if (provider.email) return provider.email;
  }
  return null;
}

function fbToShim(u: FirebaseUserLike, resolvedEmail?: string | null): ShimUser {
  const display = u.displayName ?? "";
  const [first, ...rest] = display.split(" ");
  const last = rest.join(" ");
  const email = resolvedEmail ?? u.email ?? null;
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
    isAnonymous: u.isAnonymous === true,
    setProfileImage: async () => {
      throw new Error(
        "Profile image upload is not yet wired to Firebase Storage in this build.",
      );
    },
  };
}

function isPasswordOnlyEmailUser(fbUser: FbUser): boolean {
  return fbUser.providerData.every((p) => p.providerId === "password");
}

function buildShimFromFirebaseUser(fbUser: FbUser | null): ShimUser | null {
  const resolvedEmail = resolveFirebaseUserEmail(fbUser);
  const bypassEmail = isEmailVerificationBypassEmail(resolvedEmail);
  const isUnverifiedEmailUser =
    fbUser !== null &&
    !fbUser.emailVerified &&
    !bypassEmail &&
    isPasswordOnlyEmailUser(fbUser);
  return fbUser && !isUnverifiedEmailUser
    ? fbToShim(fbUser as FirebaseUserLike, resolvedEmail)
    : null;
}

const verificationReloadInflight = new Set<string>();

function scheduleEmailVerificationSync(fbUser: FbUser): void {
  if (fbUser.emailVerified) return;
  if (isEmailVerificationBypassEmail(resolveFirebaseUserEmail(fbUser))) return;
  if (!isPasswordOnlyEmailUser(fbUser)) return;
  if (verificationReloadInflight.has(fbUser.uid)) return;

  verificationReloadInflight.add(fbUser.uid);
  void fbUser
    .reload()
    .then(async () => {
      const auth = getFirebaseAuth();
      const current = auth.currentUser;
      if (current?.uid === fbUser.uid && current.emailVerified) {
        await current.getIdToken(true).catch(() => {});
      }
      applyFirebaseUser(auth.currentUser);
    })
    .catch(() => {
      /* ignore — user may still be genuinely unverified */
    })
    .finally(() => {
      verificationReloadInflight.delete(fbUser.uid);
    });
}

function applyFirebaseUser(fbUser: FbUser | null): void {
  firstAuthEventReceived = true;
  if (raceTimeoutId !== null) {
    clearTimeout(raceTimeoutId);
    raceTimeoutId = null;
  }
  const shim = buildShimFromFirebaseUser(fbUser);
  const resolvedEmail =
    shim?.primaryEmailAddress?.emailAddress ??
    resolveFirebaseUserEmail(fbUser);
  const prevEmail =
    latestSnapshot.shim?.primaryEmailAddress?.emailAddress ?? null;
  setBirthSkyViewerEmail(resolvedEmail);
  let authStatus: AuthResolutionStatus = shim
    ? "authenticated"
    : "unauthenticated";
  if (!shim && isFirebaseOAuthRedirectResolving()) {
    authStatus = "loading";
  }
  const uid = shim?.id ?? null;
  const prevUid = latestSnapshot.shim?.id ?? null;
  const emailChanged =
    (resolvedEmail ?? null)?.toLowerCase() !== (prevEmail ?? null)?.toLowerCase();
  if (
    latestSnapshot.authStatus === authStatus &&
    prevUid === uid &&
    !emailChanged
  ) {
    return;
  }
  latestSnapshot = { shim, authStatus };
  devLog("AUTH STATE CHANGED", { authStatus, uid });
  if (!authFinishedTracked && authStatus !== "loading") {
    authFinishedTracked = true;
    trackStartupFunnel("auth_finished", {
      meta: { authStatus },
    });
  }
  for (const listener of snapshotListeners) {
    try {
      listener(latestSnapshot);
    } catch {
      /* ignore */
    }
  }
}

function notifyTimeout(): void {
  if (firstAuthEventReceived) return;
  if (isFirebaseOAuthRedirectResolving()) {
    raceTimeoutId = setTimeout(notifyTimeout, 2_000);
    return;
  }
  try {
    const pendingUser = getFirebaseAuth().currentUser;
    if (pendingUser) {
      applyFirebaseUser(pendingUser);
      return;
    }
  } catch {
    /* ignore */
  }
  firstAuthEventReceived = true;
  console.warn(`${AUTH_TAG} auth race timeout (${AUTH_RACE_TIMEOUT_MS}ms)`);
  trackStartupFunnel("auth_timeout");
  latestSnapshot = { shim: null, authStatus: "timeout" };
  for (const listener of snapshotListeners) {
    try {
      listener(latestSnapshot);
    } catch {
      /* ignore */
    }
  }
}

/**
 * One Firebase `onAuthStateChanged` for the whole app lifetime.
 * Survives React StrictMode provider remounts without re-subscribing.
 */
export function ensureFirebaseAuthListener(): void {
  if (listenerAttached) return;
  listenerAttached = true;

  let auth: ReturnType<typeof getFirebaseAuth>;
  try {
    auth = getFirebaseAuth();
  } catch (err) {
    recordBootError("getFirebaseAuth", err);
    trackStartupFunnelFailure("auth_failed", err);
    notifyTimeout();
    return;
  }

  trackStartupFunnel("auth_started");
  raceTimeoutId = setTimeout(notifyTimeout, AUTH_RACE_TIMEOUT_MS);

  onAuthStateChanged(auth, (fbUser) => {
    applyFirebaseUser(fbUser);
    if (fbUser) scheduleEmailVerificationSync(fbUser);
  });
}

/** Re-read currentUser after reload(); onAuthStateChanged does not always fire. */
export function refreshFirebaseAuthSnapshot(): void {
  try {
    applyFirebaseUser(getFirebaseAuth().currentUser);
  } catch {
    /* ignore */
  }
}

/** Pull latest emailVerified from Firebase (e.g. after inbox link on another device). */
export async function syncUserEmailVerificationFromServer(
  user: FbUser,
): Promise<FbUser> {
  try {
    await user.reload();
  } catch (err) {
    if (isNativeAmyNestShell()) {
      console.warn(
        `${AUTH_TAG} reload skipped on native (using existing session)`,
        err,
      );
    } else {
      throw err;
    }
  }
  await user.getIdToken(true).catch(() => {});
  refreshFirebaseAuthSnapshot();
  return user;
}

export function subscribeAuthSnapshot(listener: SnapshotListener): () => void {
  ensureFirebaseAuthListener();
  snapshotListeners.add(listener);
  listener(latestSnapshot);
  return () => {
    snapshotListeners.delete(listener);
  };
}

export function getLatestAuthSnapshot(): AuthSnapshot {
  return latestSnapshot;
}

/** True when Firebase has a user the app can treat as signed in (OAuth / verified / bypass). */
export function hasUsableAuthSession(): boolean {
  try {
    const snap = getLatestAuthSnapshot();
    if (snap.authStatus === "authenticated" && snap.shim) return true;
    return buildShimFromFirebaseUser(getFirebaseAuth().currentUser) !== null;
  } catch {
    return false;
  }
}

/** Push currentUser into the global auth snapshot (clears boot timeout stuck state). */
export function forceSyncAuthFromCurrentUser(): boolean {
  try {
    if (raceTimeoutId !== null) {
      clearTimeout(raceTimeoutId);
      raceTimeoutId = null;
    }
    firstAuthEventReceived = true;
    const user = getFirebaseAuth().currentUser;
    applyFirebaseUser(user);
    const snap = getLatestAuthSnapshot();
    return snap.authStatus === "authenticated" && snap.shim !== null;
  } catch {
    return false;
  }
}
