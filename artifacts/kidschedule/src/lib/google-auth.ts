import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithRedirect,
  type UserCredential,
} from "firebase/auth";
import { logFirebaseAuthError } from "@/lib/firebase-auth-error";
import { getFirebaseAuth } from "@/lib/firebase";
import { isCapacitorNative } from "@/lib/capacitor-native";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import { resolveFirebaseAuthRedirectResult } from "@/lib/firebase-oauth-redirect";
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

/** Android WebView APK — native account picker via AuthBridge.kt. */
export async function loginAndroidWebViewGoogle(): Promise<void> {
  const { signInWithGoogleViaNativeBridge } = await import("@/lib/native-auth");
  const { idToken } = await signInWithGoogleViaNativeBridge();
  const credential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(getFirebaseAuth(), credential);
  console.info(`${GOOGLE_TAG} android webview google sign-in success`);
}

/** Web/PWA: redirect. Capacitor / Android WebView: native idToken → Firebase. */
export async function handleGoogleLogin(): Promise<void> {
  if (shouldUseNativeGoogleAuth()) {
    return loginNativeGoogle();
  }
  if (shouldUseAndroidWebViewGoogleAuth()) {
    return loginAndroidWebViewGoogle();
  }
  return loginWithGoogleRedirect();
}

/**
 * @deprecated Use resolveFirebaseAuthRedirectResult — kept for call-site compatibility.
 */
export async function resolveGoogleRedirectResult(): Promise<UserCredential | null> {
  return resolveFirebaseAuthRedirectResult();
}
