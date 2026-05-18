import { Capacitor } from "@capacitor/core";
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithCredential,
  signInWithRedirect,
  type UserCredential,
} from "firebase/auth";
import { logFirebaseAuthError } from "@/lib/firebase-auth-error";
import { getFirebaseAuth } from "@/lib/firebase";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import {
  googleAuthDefaults,
  reversedGoogleWebClientId,
} from "@/lib/google-auth-defaults";

const GOOGLE_TAG = "[amynest:google-auth]";

export function getGoogleWebClientId(): string {
  const fromEnv = (
    import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined
  )?.trim();
  return fromEnv || googleAuthDefaults.webClientId;
}

export function getGoogleIosClientId(): string | undefined {
  const fromEnv = (
    import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined
  )?.trim();
  return fromEnv || undefined;
}

export function getGoogleReversedClientId(): string {
  const iosId = getGoogleIosClientId();
  if (iosId) return reversedGoogleWebClientId(iosId);
  return reversedGoogleWebClientId(getGoogleWebClientId());
}

/** True when running inside Capacitor iOS/Android (not browser PWA). */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.isNativePlatform() === true;
  } catch {
    return false;
  }
}

/** Native Google plugin path — avoids Firebase redirect/popup in WKWebView. */
export function shouldUseNativeGoogleAuth(): boolean {
  return isNativeAmyNestShell() && isCapacitorNative();
}

export function loginWithGoogleRedirect(): Promise<void> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithRedirect(auth, provider);
}

let nativeGoogleInitDone = false;

export async function initNativeGoogleAuth(): Promise<void> {
  if (!shouldUseNativeGoogleAuth() || nativeGoogleInitDone) return;

  const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
  const webClientId = getGoogleWebClientId();
  const iosClientId = getGoogleIosClientId();

  GoogleAuth.initialize({
    clientId: webClientId,
    ...(iosClientId ? { iosClientId } : {}),
    scopes: ["profile", "email"],
    grantOfflineAccess: false,
  });

  nativeGoogleInitDone = true;
  console.info(`${GOOGLE_TAG} native GoogleAuth initialized`);
}

export async function loginNativeGoogle(): Promise<void> {
  await initNativeGoogleAuth();
  const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
  const result = await GoogleAuth.signIn();
  const idToken = result.authentication?.idToken;
  if (!idToken) {
    throw Object.assign(new Error("Google sign-in did not return an ID token."), {
      code: "app/google-no-id-token",
    });
  }
  const credential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(getFirebaseAuth(), credential);
}

/** Web/PWA: redirect. Capacitor: native Google SDK + Firebase credential. */
export async function handleGoogleLogin(): Promise<void> {
  if (shouldUseNativeGoogleAuth()) {
    return loginNativeGoogle();
  }
  return loginWithGoogleRedirect();
}

let redirectResultConsumed = false;

/**
 * Call once after Firebase init on web/PWA to complete signInWithRedirect round-trip.
 * No-op in Capacitor native shells.
 */
export async function resolveGoogleRedirectResult(): Promise<UserCredential | null> {
  if (typeof window === "undefined") return null;
  if (shouldUseNativeGoogleAuth()) return null;
  if (redirectResultConsumed) return null;

  redirectResultConsumed = true;
  try {
    const result = await getRedirectResult(getFirebaseAuth());
    if (result?.user) {
      console.info(`${GOOGLE_TAG} redirect sign-in success`, {
        uid: result.user.uid,
        email: result.user.email,
      });
    }
    return result;
  } catch (err) {
    logFirebaseAuthError("google:redirect", err);
    throw err;
  }
}
