import { onAuthStateChanged, type User as FbUser } from "firebase/auth";
import { getFirebaseAuth } from "./firebase";
import type { AuthResolutionStatus, ShimUser } from "./firebase-auth-context";
import { recordBootError } from "@/lib/boot-store";
import { isEmailVerificationBypassEmail } from "./email-verification-bypass";
import { devLog } from "@/lib/dev-log";
import { isFirebaseOAuthRedirectResolving } from "@/lib/firebase-oauth-redirect";

const AUTH_TAG = "[amynest:firebase-auth]";
const AUTH_RACE_TIMEOUT_MS = 10_000;

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

type FirebaseUserLike = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
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
  return fbUser && !isUnverifiedEmailUser ? fbToShim(fbUser as FirebaseUserLike) : null;
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
  let authStatus: AuthResolutionStatus = shim
    ? "authenticated"
    : "unauthenticated";
  if (!shim && isFirebaseOAuthRedirectResolving()) {
    authStatus = "loading";
  }
  const uid = shim?.id ?? null;
  const prevUid = latestSnapshot.shim?.id ?? null;
  if (
    latestSnapshot.authStatus === authStatus &&
    prevUid === uid
  ) {
    return;
  }
  latestSnapshot = { shim, authStatus };
  devLog("AUTH STATE CHANGED", { authStatus, uid });
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
  firstAuthEventReceived = true;
  console.warn(`${AUTH_TAG} auth race timeout (${AUTH_RACE_TIMEOUT_MS}ms)`);
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
    notifyTimeout();
    return;
  }

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
  await user.reload();
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
