import {
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { ensureFirebaseAuthPersistence, getFirebaseAuth } from "@/lib/firebase";
import { isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";
import {
  finalizeOAuthCredentialSignIn,
  finishOAuthLoginFlow,
} from "@/lib/oauth-session-finalize";

const FACEBOOK_TAG = "[amynest:facebook-auth]";

function buildFacebookProvider(): OAuthProvider {
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

export async function loginWithFacebookPopup(): Promise<string> {
  await ensureFirebaseAuthPersistence();
  const auth = getFirebaseAuth();
  const provider = buildFacebookProvider();
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
  const provider = buildFacebookProvider();
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

/** Web/PWA popup+redirect; Play WebView uses redirect (popups unreliable in WebView). */
export async function handleFacebookLogin(): Promise<string | void> {
  if (isNativeAmyNestAndroidWrapper()) {
    await loginWithFacebookRedirect();
    return;
  }
  return loginWithWebFallback();
}
