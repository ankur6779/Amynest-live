import { onAuthStateChanged, type User as FbUser } from "firebase/auth";
import { getFirebaseAuth } from "./firebase";
import type { AuthResolutionStatus, ShimUser } from "./firebase-auth-context";
import { recordBootError } from "@/lib/boot-store";
import { devLog } from "@/lib/dev-log";

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

function applyFirebaseUser(fbUser: FbUser | null): void {
  firstAuthEventReceived = true;
  if (raceTimeoutId !== null) {
    clearTimeout(raceTimeoutId);
    raceTimeoutId = null;
  }
  const shim = buildShimFromFirebaseUser(fbUser);
  const authStatus: AuthResolutionStatus = shim ? "authenticated" : "unauthenticated";
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
  });
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
