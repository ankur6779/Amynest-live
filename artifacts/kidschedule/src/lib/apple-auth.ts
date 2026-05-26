import { Capacitor } from "@capacitor/core";
import { isCapacitorNative } from "@/lib/capacitor-native";
import {
  OAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
  type UserCredential,
} from "firebase/auth";
import { logFirebaseAuthError } from "@/lib/firebase-auth-error";
import { ensureFirebaseAuthPersistence, getFirebaseAuth } from "@/lib/firebase";
import { generateRawNonce, sha256Hex } from "@/lib/auth-nonce";
import {
  finalizeOAuthCredentialSignIn,
  finishOAuthLoginFlow,
} from "@/lib/oauth-session-finalize";
import {
  appleAuthDefaults,
  getAppleIosClientId,
  getAppleRedirectUri,
  getAppleWebClientId,
} from "@/lib/apple-auth-defaults";
import {
  loginWithAppleWebSdkPopup,
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
  if (!isCapacitorNative()) return false;
  try {
    return Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}

export function isAppleSignInAvailable(): boolean {
  if (shouldUseNativeAppleAuth()) return true;
  if (typeof window !== "undefined") {
    const proto = (window.location.protocol || "").toLowerCase();
    if (proto === "capacitor:" || proto === "ionic:") {
      try {
        return Capacitor.getPlatform() === "ios";
      } catch {
        return true;
      }
    }
  }
  if (typeof window === "undefined") return false;
  // Web: Apple JS SDK when Services ID is set; otherwise Firebase redirect still works.
  return true;
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

function buildAppleFirebaseProvider(): OAuthProvider {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  return provider;
}

/** Firebase OAuth popup — preferred on mobile browsers. */
async function loginWithAppleFirebasePopup(): Promise<UserCredential | null> {
  const provider = buildAppleFirebaseProvider();
  try {
    return await signInWithPopup(getFirebaseAuth(), provider);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/popup-blocked") {
      await signInWithRedirect(getFirebaseAuth(), provider);
      return null;
    }
    throw err;
  }
}

/** Firebase redirect fallback when popups are blocked. */
export function loginWithAppleFirebaseRedirect(): Promise<void> {
  return signInWithRedirect(getFirebaseAuth(), buildAppleFirebaseProvider());
}

export async function loginNativeApple(): Promise<void> {
  await ensureFirebaseAuthPersistence();
  const rawNonce = generateRawNonce();
  const hashedNonce = await sha256Hex(rawNonce);

  const { SignInWithApple } = await import(
    "@capacitor-community/apple-sign-in"
  );

  const appleResult = await SignInWithApple.authorize({
    clientId: getAppleIosClientId(),
    redirectURI: getAppleRedirectUri(),
    scopes: "email name",
    state: rawNonce,
    nonce: hashedNonce,
  });

  const idToken = appleResult.response?.identityToken;
  if (!idToken) {
    throw Object.assign(
      new Error("Apple sign-in did not return an identity token."),
      { code: "app/apple-no-id-token" },
    );
  }

  const given = appleResult.response.givenName ?? "";
  const family = appleResult.response.familyName ?? "";
  const fullName = [given, family].filter(Boolean).join(" ").trim() || null;

  const credential = await signInFirebaseWithAppleToken(idToken, rawNonce, fullName);
  await finalizeOAuthCredentialSignIn(credential);
  console.info(`${APPLE_TAG} native sign-in success`);
  await finishAppleLoginFlow();
}

async function finishAppleLoginFlow(): Promise<void> {
  await finishOAuthLoginFlow();
}

/**
 * Web browser: Apple JS SDK popup when Services ID is configured, otherwise
 * Firebase OAuth popup (redirect if the popup is blocked).
 */
export async function loginWithAppleWeb(): Promise<void> {
  if (getAppleWebClientId()) {
    const { idToken, rawNonce, fullName } = await loginWithAppleWebSdkPopup();
    const result = await signInFirebaseWithAppleToken(idToken, rawNonce, fullName);
    await finalizeOAuthCredentialSignIn(result);
    console.info(`${APPLE_TAG} web popup sign-in success`);
    await finishAppleLoginFlow();
    return;
  }

  const result = await loginWithAppleFirebasePopup();
  if (result?.user) {
    await finalizeOAuthCredentialSignIn(result);
    console.info(`${APPLE_TAG} firebase popup sign-in success`, {
      uid: result.user.uid,
    });
    await finishAppleLoginFlow();
  }
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
  await finalizeOAuthCredentialSignIn(result);
  await finishAppleLoginFlow();
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
