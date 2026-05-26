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

/** Capacitor native shell — uses @codetrix-studio/capacitor-google-auth plugin. */
export function shouldUseNativeGoogleAuth(): boolean {
  return isNativeAmyNestShell() && isCapacitorNative();
}

/** Android WebView wrapper (Play Store APK) — uses AmyNestAuthNative bridge. */
export function shouldUseAndroidWebViewGoogleAuth(): boolean {
  return isNativeAmyNestShell() && !isCapacitorNative();
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

async function finalizeGoogleCredentialSignIn(
  result: UserCredential,
): Promise<User> {
  return finalizeOAuthCredentialSignIn(result);
}

/** Exchange a Google ID token for a Firebase session (native bridge + recovery). */
export async function completeGoogleIdTokenSignIn(idToken: string): Promise<User> {
  await ensureFirebaseAuthPersistence();
  const credential = GoogleAuthProvider.credential(idToken);
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
  const { signInWithGoogleViaNativeBridge } = await import("@/lib/native-auth");
  const { idToken } = await signInWithGoogleViaNativeBridge();
  await signInFirebaseWithGoogleIdToken(idToken);
  console.info(`${GOOGLE_TAG} android webview google sign-in success`);
  return finishGoogleLoginFlow();
}

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
 * Web/PWA: popup first, redirect fallback. Native shells use bridge/plugins
 * with automatic web fallback when the native plugin is unavailable.
 */
export async function handleGoogleLogin(): Promise<string | void> {
  if (shouldUseNativeGoogleAuth()) {
    try {
      return await loginNativeGoogle();
    } catch (err) {
      console.warn(`${GOOGLE_TAG} native Google auth failed — falling back to web flow`, err);
      return loginWithWebFallback();
    }
  }
  if (shouldUseAndroidWebViewGoogleAuth()) {
    try {
      return await loginAndroidWebViewGoogle();
    } catch (err) {
      console.warn(`${GOOGLE_TAG} Android WebView Google auth failed — falling back to web flow`, err);
      return loginWithWebFallback();
    }
  }
  return loginWithWebFallback();
}

/**
 * @deprecated Use resolveFirebaseAuthRedirectResult — kept for call-site compatibility.
 */
export async function resolveGoogleRedirectResult(): Promise<UserCredential | null> {
  return resolveFirebaseAuthRedirectResult();
}
