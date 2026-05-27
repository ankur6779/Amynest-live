import {
  FacebookAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from "firebase/auth";
import { ensureFirebaseAuthPersistence, getFirebaseAuth } from "@/lib/firebase";
import { isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";
import {
  finalizeOAuthCredentialSignIn,
  finishOAuthLoginFlow,
} from "@/lib/oauth-session-finalize";

const FACEBOOK_TAG = "[amynest:facebook-auth]";

function buildFacebookOAuthProvider(): OAuthProvider {
  const provider = new OAuthProvider("facebook.com");
  provider.addScope("email");
  provider.addScope("public_profile");
  return provider;
}

function isFacebookPopupBlockedOrClosed(err: unknown): boolean {
  const code = (err as { code?: string })?.code ?? "";
  return (
    code === "auth/popup-blocked" ||
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request"
  );
}

async function signInFirebaseWithFacebookAccessToken(accessToken: string): Promise<User> {
  await ensureFirebaseAuthPersistence();
  const credential = FacebookAuthProvider.credential(accessToken);
  const result = await signInWithCredential(getFirebaseAuth(), credential);
  return finalizeOAuthCredentialSignIn(result);
}

export async function loginWithFacebookPopup(): Promise<string> {
  await ensureFirebaseAuthPersistence();
  const auth = getFirebaseAuth();
  const provider = buildFacebookOAuthProvider();
  console.info(`${FACEBOOK_TAG} starting Facebook popup`, {
    origin: window.location.origin,
    href: window.location.href,
  });
  const result = await signInWithPopup(auth, provider);
  await finalizeOAuthCredentialSignIn(result);
  console.info(`${FACEBOOK_TAG} facebook popup sign-in success`, {
    uid: result.user.uid,
  });
  return finishOAuthLoginFlow(undefined, { skipNavigation: true });
}

export async function loginWithFacebookRedirect(): Promise<void> {
  await ensureFirebaseAuthPersistence();
  const auth = getFirebaseAuth();
  const provider = buildFacebookOAuthProvider();
  console.info(`${FACEBOOK_TAG} starting Facebook redirect`, {
    origin: window.location.origin,
    href: window.location.href,
  });
  await signInWithRedirect(auth, provider);
}

async function loginWithWebFallback(): Promise<string | void> {
  try {
    return await loginWithFacebookPopup();
  } catch (err) {
    if (isFacebookPopupBlockedOrClosed(err)) {
      console.info(`${FACEBOOK_TAG} popup unavailable — falling back to redirect`);
      await loginWithFacebookRedirect();
      return;
    }
    throw err;
  }
}

/** Play Store WebView — native Facebook SDK via AuthBridge.kt (same pattern as Google). */
export async function loginAndroidWebViewFacebook(): Promise<string> {
  console.info(`${FACEBOOK_TAG} android webview flow start`, {
    href: typeof window !== "undefined" ? window.location.href : "",
  });
  const { probeFacebookBridgeAvailability, signInWithFacebookViaNativeBridge, logNativeAuthDiagnostics } =
    await import("@/lib/native-auth");
  const bridgeReady = await probeFacebookBridgeAvailability();
  if (bridgeReady === false) {
    throw Object.assign(
      new Error(
        "Sign-in native bridge is not ready. Close and reopen the app, then try again.",
      ),
      { code: "app/auth-bridge-unavailable" },
    );
  }
  void logNativeAuthDiagnostics();
  const { accessToken } = await signInWithFacebookViaNativeBridge();
  console.info(`${FACEBOOK_TAG} access token received, signing into Firebase`, {
    tokenLen: accessToken.length,
  });
  await signInFirebaseWithFacebookAccessToken(accessToken);
  const dest = await finishOAuthLoginFlow(undefined, { skipNavigation: true });
  console.info(`${FACEBOOK_TAG} android webview facebook sign-in success`, { dest });
  return dest;
}

/** Native Android bridge first; web/PWA uses popup+redirect. */
export async function handleFacebookLogin(): Promise<string | void> {
  if (isNativeAmyNestAndroidWrapper()) {
    return loginAndroidWebViewFacebook();
  }
  return loginWithWebFallback();
}
