import { Capacitor } from "@capacitor/core";
import { isCapacitorNative } from "@/lib/capacitor-native";
import {
  OAuthProvider,
  signInWithCredential,
  signInWithRedirect,
  updateProfile,
  type UserCredential,
} from "firebase/auth";
import { logFirebaseAuthError } from "@/lib/firebase-auth-error";
import { getFirebaseAuth } from "@/lib/firebase";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import { generateRawNonce, sha256Hex } from "@/lib/auth-nonce";
import {
  appleAuthDefaults,
  getAppleIosClientId,
  getAppleRedirectUri,
  getAppleWebClientId,
} from "@/lib/apple-auth-defaults";
import {
  loginWithAppleWebSdk,
  waitForAppleWebRedirectResult,
  bootAppleWebCallbackListener,
  prepareAppleWebNonce,
  APPLE_RAW_NONCE_STORAGE_KEY,
} from "@/lib/apple-web-sdk";
const APPLE_TAG = "[amynest:apple-auth]";

export {
  getAppleWebClientId,
  getAppleIosClientId,
  getAppleRedirectUri,
} from "@/lib/apple-auth-defaults";

export function isAppleCallbackPath(): boolean {
  if (typeof window === "undefined") return false;
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const expected = `${base}${appleAuthDefaults.redirectPath}`.replace(
    /\/+/g,
    "/",
  );
  return window.location.pathname === expected;
}

/** Native Sign in with Apple via Capacitor (iOS only). */
export function shouldUseNativeAppleAuth(): boolean {
  if (!isNativeAmyNestShell() || !isCapacitorNative()) return false;
  try {
    return Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}

export function isAppleSignInAvailable(): boolean {
  if (shouldUseNativeAppleAuth()) return true;
  if (typeof window === "undefined") return false;
  return Boolean(getAppleWebClientId());
}

async function signInFirebaseWithAppleToken(
  idToken: string,
  rawNonce: string,
  fullName: string | null,
): Promise<UserCredential> {
  const provider = new OAuthProvider("apple.com");
  const credential = provider.credential({ idToken, rawNonce });
  const result = await signInWithCredential(getFirebaseAuth(), credential);

  if (fullName && result.user && !result.user.displayName) {
    try {
      await updateProfile(result.user, { displayName: fullName });
    } catch {
      /* non-fatal */
    }
  }

  return result;
}

/** Firebase redirect fallback when web Services ID uses OAuth provider only. */
export function loginWithAppleFirebaseRedirect(): Promise<void> {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  return signInWithRedirect(getFirebaseAuth(), provider);
}

export async function loginNativeApple(): Promise<void> {
  const rawNonce = generateRawNonce();
  const hashedNonce = await sha256Hex(rawNonce);

  const { SignInWithApple } = await import(
    "@capacitor-community/apple-sign-in"
  );

  const result = await SignInWithApple.authorize({
    clientId: getAppleIosClientId(),
    redirectURI: getAppleRedirectUri(),
    scopes: "email name",
    state: rawNonce,
    nonce: hashedNonce,
  });

  const idToken = result.response?.identityToken;
  if (!idToken) {
    throw Object.assign(
      new Error("Apple sign-in did not return an identity token."),
      { code: "app/apple-no-id-token" },
    );
  }

  const given = result.response.givenName ?? "";
  const family = result.response.familyName ?? "";
  const fullName = [given, family].filter(Boolean).join(" ").trim() || null;

  await signInFirebaseWithAppleToken(idToken, rawNonce, fullName);
  console.info(`${APPLE_TAG} native sign-in success`);
}

/**
 * Web: Apple JS SDK redirect (usePopup: false).
 * Falls back to Firebase redirect if VITE_APPLE_WEB_CLIENT_ID is unset.
 */
export async function loginWithAppleWeb(): Promise<void> {
  if (getAppleWebClientId()) {
    return loginWithAppleWebSdk();
  }
  return loginWithAppleFirebaseRedirect();
}

/** Complete Apple JS SDK redirect on /auth/apple/callback. */
export async function resolveAppleWebCallback(): Promise<UserCredential | null> {
  if (!isAppleCallbackPath()) return null;
  if (shouldUseNativeAppleAuth()) return null;

  const rawNonce = sessionStorage.getItem(APPLE_RAW_NONCE_STORAGE_KEY);
  if (!rawNonce) return null;

  const hashedNonce = await sha256Hex(rawNonce);
  await bootAppleWebCallbackListener(hashedNonce);

  const { idToken, rawNonce: nonce, fullName } =
    await waitForAppleWebRedirectResult();

  const result = await signInFirebaseWithAppleToken(idToken, nonce, fullName);
  console.info(`${APPLE_TAG} web redirect sign-in success`, {
    uid: result.user.uid,
  });
  return result;
}

/** Web/PWA: Apple JS SDK or Firebase redirect. Capacitor iOS: native plugin. */
export async function handleAppleLogin(): Promise<void> {
  if (shouldUseNativeAppleAuth()) {
    return loginNativeApple();
  }
  return loginWithAppleWeb();
}

/** Prepare nonce storage before navigating to callback (callback route boot). */
export async function ensureAppleCallbackNonceReady(): Promise<void> {
  if (!sessionStorage.getItem(APPLE_RAW_NONCE_STORAGE_KEY)) {
    await prepareAppleWebNonce();
  }
}
