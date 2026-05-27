import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  type User,
  type UserCredential,
} from "firebase/auth";
import { logFirebaseAuthError } from "@/lib/firebase-auth-error";
import { ensureFirebaseAuthPersistence, getFirebaseAuth } from "@/lib/firebase";
import { isCapacitorNative } from "@/lib/capacitor-native";
import { isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import { resolveFirebaseAuthRedirectResult } from "@/lib/firebase-oauth-redirect";
import {
  finalizeOAuthCredentialSignIn,
  finishOAuthLoginFlow,
  navigateAfterOAuthSignIn,
} from "@/lib/oauth-session-finalize";
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

export { isCapacitorNative } from "@/lib/capacitor-native";

function isCapacitorIos(): boolean {
  if (!isCapacitorNative()) return false;
  try {
    return (
      window as Window & {
        Capacitor?: { getPlatform?: () => string };
      }
    ).Capacitor?.getPlatform?.() === "ios";
  } catch {
    return false;
  }
}

/**
 * Capacitor iOS only (@codetrix-studio/capacitor-google-auth).
 * Play Store Android is NOT Capacitor — use [shouldUseAndroidWebViewGoogleAuth].
 */
export function shouldUseCapacitorGoogleAuth(): boolean {
  return isCapacitorIos();
}

/** @deprecated Use shouldUseCapacitorGoogleAuth — kept for call-site compatibility. */
export function shouldUseNativeGoogleAuth(): boolean {
  return shouldUseCapacitorGoogleAuth();
}

/**
 * Play Store Android WebView wrapper (`android/` + AuthBridge.kt).
 * Loads www.amynest.in — no Capacitor runtime.
 */
export function shouldUseAndroidWebViewGoogleAuth(): boolean {
  return isNativeAmyNestAndroidWrapper();
}

function assertGoogleIdToken(idToken: string): string {
  const trimmed = idToken.trim();
  if (!trimmed || trimmed.length < 20) {
    throw Object.assign(new Error("Google sign-in did not return a valid ID token."), {
      code: "auth/argument-error",
    });
  }
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed)) {
    throw Object.assign(new Error("Google sign-in returned a malformed ID token."), {
      code: "auth/argument-error",
    });
  }
  return trimmed;
}

export async function loginWithGoogleRedirect(): Promise<void> {
  await ensureFirebaseAuthPersistence();
  clearStaleFirebaseRedirectState();
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  console.info(`${GOOGLE_TAG} starting Google redirect`, {
    origin: window.location.origin,
    href: window.location.href,
  });
  await signInWithRedirect(auth, provider);
}

function clearStaleFirebaseRedirectState(): void {
  if (typeof window === "undefined") return;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i) ?? "";
      if (/firebase:.*(pendingRedirect|redirectEvent)/i.test(key)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    /* ignore */
  }
}

function isGooglePopupBlockedOrClosed(err: unknown): boolean {
  const code = (err as { code?: string })?.code ?? "";
  return (
    code === "auth/popup-blocked" ||
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request"
  );
}

/** Web browser — popup avoids redirect state loss in SPA reloads. */
export async function loginWithGooglePopup(): Promise<string> {
  await ensureFirebaseAuthPersistence();
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  console.info(`${GOOGLE_TAG} starting Google popup`, {
    origin: window.location.origin,
    href: window.location.href,
  });
  const result = await signInWithPopup(auth, provider);
  await finalizeGoogleCredentialSignIn(result);
  console.info(`${GOOGLE_TAG} google popup sign-in success`, {
    uid: result.user.uid,
  });
  return finishGoogleLoginFlow();
}

let nativeGoogleInitDone = false;

export async function initNativeGoogleAuth(): Promise<void> {
  if (!shouldUseCapacitorGoogleAuth() || nativeGoogleInitDone) return;

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

async function finalizeGoogleCredentialSignIn(
  result: UserCredential,
): Promise<User> {
  return finalizeOAuthCredentialSignIn(result);
}

/** Exchange a Google ID token for a Firebase session (native bridge + recovery). */
export async function completeGoogleIdTokenSignIn(idToken: string): Promise<User> {
  await ensureFirebaseAuthPersistence();
  const credential = GoogleAuthProvider.credential(assertGoogleIdToken(idToken));
  const result = await signInWithCredential(getFirebaseAuth(), credential);
  const user = await finalizeGoogleCredentialSignIn(result);
  console.info(`${GOOGLE_TAG} firebase credential sign-in success`, {
    uid: user.uid,
  });
  return user;
}

async function signInFirebaseWithGoogleIdToken(idToken: string): Promise<User> {
  return completeGoogleIdTokenSignIn(idToken);
}

/** Hard navigation after OAuth so route guards see persisted Firebase auth. */
export { navigateAfterOAuthSignIn } from "@/lib/oauth-session-finalize";

async function finishGoogleLoginFlow(): Promise<string> {
  const destination = await finishOAuthLoginFlow();
  if (shouldUseAndroidWebViewGoogleAuth()) {
    const { clearPendingNativeGoogleAuth } = await import("@/lib/native-auth");
    void clearPendingNativeGoogleAuth();
  }
  return destination;
}

let pendingBootstrapInFlight = false;

/** Resume Google sign-in after WebView reload (native token injected on page load). */
export async function bootstrapPendingGoogleSignIn(): Promise<boolean> {
  if (!shouldUseAndroidWebViewGoogleAuth() || pendingBootstrapInFlight) {
    return false;
  }
  const { readPendingNativeGoogleIdToken } = await import("@/lib/native-auth");
  const idToken = readPendingNativeGoogleIdToken();
  if (!idToken) return false;

  pendingBootstrapInFlight = true;
  try {
    await completeGoogleIdTokenSignIn(idToken);
    await finishGoogleLoginFlow();
    return true;
  } catch (err) {
    logFirebaseAuthError("google:bootstrap-pending", err);
    return false;
  } finally {
    pendingBootstrapInFlight = false;
  }
}

export async function loginNativeGoogle(): Promise<string> {
  await initNativeGoogleAuth();
  const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
  const result = await GoogleAuth.signIn();
  const idToken = result.authentication?.idToken;
  if (!idToken) {
    throw Object.assign(new Error("Google sign-in did not return an ID token."), {
      code: "app/google-no-id-token",
    });
  }
  await signInFirebaseWithGoogleIdToken(idToken);
  return finishGoogleLoginFlow();
}

/** Android WebView APK — native account picker via AuthBridge.kt. */
export async function loginAndroidWebViewGoogle(): Promise<string> {
  const { probeAuthBridgeAvailability, signInWithGoogleViaNativeBridge } =
    await import("@/lib/native-auth");
  const bridgeReady = await probeAuthBridgeAvailability();
  if (bridgeReady === false) {
    throw Object.assign(
      new Error(
        "Google Sign-In native bridge is not ready. Close and reopen the app, then try again.",
      ),
      { code: "app/auth-bridge-unavailable" },
    );
  }
  const { idToken } = await signInWithGoogleViaNativeBridge();
  await signInFirebaseWithGoogleIdToken(idToken);
  console.info(`${GOOGLE_TAG} android webview google sign-in success`);
  return finishGoogleLoginFlow();
}

/** Web/PWA only — popup first, redirect fallback. */
async function loginWithWebFallback(): Promise<string | void> {
  try {
    return await loginWithGooglePopup();
  } catch (err) {
    if (isGooglePopupBlockedOrClosed(err)) {
      console.info(`${GOOGLE_TAG} popup unavailable — falling back to redirect`);
      await loginWithGoogleRedirect();
      return;
    }
    throw err;
  }
}

/**
 * Play Android → AuthBridge. Capacitor iOS → GoogleAuth plugin (if enabled in UI).
 * Web/PWA → popup/redirect. Web OAuth in Play WebView causes auth/argument-error.
 */
export async function handleGoogleLogin(): Promise<string | void> {
  if (shouldUseAndroidWebViewGoogleAuth()) {
    return loginAndroidWebViewGoogle();
  }
  if (shouldUseCapacitorGoogleAuth()) {
    return loginNativeGoogle();
  }
  if (isNativeAmyNestShell()) {
    throw Object.assign(
      new Error(
        "Google Sign-In must use the native account picker in the app. Update the app from the Play Store and try again.",
      ),
      { code: "app/google-native-required" },
    );
  }
  return loginWithWebFallback();
}

/**
 * @deprecated Use resolveFirebaseAuthRedirectResult — kept for call-site compatibility.
 */
export async function resolveGoogleRedirectResult(): Promise<UserCredential | null> {
  return resolveFirebaseAuthRedirectResult();
}
