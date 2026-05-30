import {
  FacebookAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
  type User,
} from "firebase/auth";
import { logFirebaseAuthError } from "@/lib/firebase-auth-error";
import { ensureFirebaseAuthPersistence, getFirebaseAuth } from "@/lib/firebase";
import { isCapacitorIosShell, isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";
import { isNativeAmyNestShell } from "@/lib/native-shell";
import { shouldUseCapacitorIosFacebookAuth } from "@/lib/auth-feature-flags";
import {
  finalizeOAuthCredentialSignIn,
  finishOAuthLoginFlow,
} from "@/lib/oauth-session-finalize";

const FACEBOOK_TAG = "[amynest:facebook-auth]";
const FACEBOOK_APP_ID = "2514850758945614";

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

function assertFacebookToken(token: string, label: "access token" | "ID token"): string {
  const trimmed = token.trim();
  if (!trimmed || trimmed.length < 20) {
    throw Object.assign(
      new Error(`Facebook sign-in did not return a valid ${label}.`),
      { code: "app/facebook-no-access-token" },
    );
  }
  return trimmed;
}

function throwFacebookFirebaseCredentialFailed(
  err: unknown,
  context: { credentialKind: "access" | "idToken"; tokenLen: number },
): never {
  const code = (err as { code?: string })?.code ?? "";
  console.error(`${FACEBOOK_TAG} Firebase credential sign-in failed`, {
    ...context,
    code,
    err,
  });
  if (
    code === "auth/invalid-credential" ||
    code === "auth/argument-error" ||
    code === "auth/operation-not-allowed"
  ) {
    throw Object.assign(
      new Error(
        "Facebook sign-in could not be verified with Firebase. Confirm Facebook is enabled in Firebase Authentication, then try again.",
      ),
      { code: "app/facebook-firebase-credential-failed" },
    );
  }
  throw err;
}

/** Raw nonce for Facebook Limited Login (plugin hashes before sending to the SDK). */
export function generateFacebookLoginNonce(length = 32): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
}

type FacebookGraphProfile = {
  name?: string;
  email?: string;
};

/** Best-effort: pull name/email from Graph API so onboarding can save parent profile. */
async function enrichFirebaseUserFromFacebookGraph(
  accessToken: string,
  user: User,
): Promise<void> {
  try {
    const url = new URL("https://graph.facebook.com/v21.0/me");
    url.searchParams.set("fields", "name,email");
    url.searchParams.set("access_token", accessToken);
    const res = await fetch(url.toString());
    if (!res.ok) return;
    const body = (await res.json()) as FacebookGraphProfile;
    const displayName = body.name?.trim();
    if (displayName && !user.displayName?.trim()) {
      await updateProfile(user, { displayName });
    }
  } catch (err) {
    console.warn(`${FACEBOOK_TAG} graph profile enrich skipped`, err);
  }
}

/** Classic Graph API access token (Android WebView native bridge). */
export async function completeFacebookAccessTokenSignIn(
  accessToken: string,
): Promise<User> {
  await ensureFirebaseAuthPersistence();
  const token = assertFacebookToken(accessToken, "access token");
  const credential = FacebookAuthProvider.credential(token);
  try {
    const result = await signInWithCredential(getFirebaseAuth(), credential);
    const user = await finalizeOAuthCredentialSignIn(result);
    await enrichFirebaseUserFromFacebookGraph(token, user);
    return user;
  } catch (err) {
    throwFacebookFirebaseCredentialFailed(err, {
      credentialKind: "access",
      tokenLen: token.length,
    });
  }
}

async function signInFirebaseWithFacebookAccessToken(accessToken: string): Promise<User> {
  return completeFacebookAccessTokenSignIn(accessToken);
}

/**
 * Facebook Limited Login OIDC token from iOS native SDK.
 * @capacitor-community/facebook-login iOS plugin returns AuthenticationToken.tokenString.
 */
async function signInFirebaseWithFacebookIdToken(
  idToken: string,
  rawNonce: string,
): Promise<User> {
  await ensureFirebaseAuthPersistence();
  const token = assertFacebookToken(idToken, "ID token");
  const nonce = rawNonce.trim();
  if (!nonce) {
    throw Object.assign(new Error("Facebook sign-in nonce is missing."), {
      code: "app/facebook-no-access-token",
    });
  }
  const provider = new OAuthProvider("facebook.com");
  const credential = provider.credential({ idToken: token, rawNonce: nonce });
  try {
    const result = await signInWithCredential(getFirebaseAuth(), credential);
    return finalizeOAuthCredentialSignIn(result);
  } catch (err) {
    throwFacebookFirebaseCredentialFailed(err, {
      credentialKind: "idToken",
      tokenLen: token.length,
    });
  }
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

let nativeFacebookInitDone = false;

async function initNativeFacebookLogin(): Promise<void> {
  if (nativeFacebookInitDone) return;
  const { FacebookLogin } = await import("@capacitor-community/facebook-login");
  await FacebookLogin.initialize({ appId: FACEBOOK_APP_ID });
  nativeFacebookInitDone = true;
}

async function loginCapacitorIosFacebook(): Promise<string> {
  await initNativeFacebookLogin();
  const { FacebookLogin } = await import("@capacitor-community/facebook-login");
  const rawNonce = generateFacebookLoginNonce();
  const result = await FacebookLogin.login({
    permissions: ["email", "public_profile"],
    // iOS plugin returns AuthenticationToken (OIDC), not AccessToken — use Limited Login + nonce.
    tracking: "limited",
    nonce: rawNonce,
  });
  const idToken = result.accessToken?.token?.trim();
  if (!idToken) {
    throw Object.assign(new Error("Facebook sign-in did not return an access token."), {
      code: "app/facebook-no-access-token",
    });
  }
  console.info(`${FACEBOOK_TAG} capacitor iOS facebook token received`, {
    tokenLen: idToken.length,
    credentialKind: "idToken",
  });
  await signInFirebaseWithFacebookIdToken(idToken, rawNonce);
  const dest = await finishOAuthLoginFlow(undefined, { skipNavigation: true });
  console.info(`${FACEBOOK_TAG} capacitor iOS facebook sign-in success`, { dest });
  return dest;
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

async function finishFacebookLoginFlow(opts?: {
  skipNavigation?: boolean;
}): Promise<string> {
  const destination = await finishOAuthLoginFlow(undefined, {
    skipNavigation: opts?.skipNavigation,
  });
  if (isNativeAmyNestAndroidWrapper()) {
    const { clearPendingNativeFacebookAuth } = await import("@/lib/native-auth");
    void clearPendingNativeFacebookAuth();
  }
  return destination;
}

let pendingFacebookBootstrapInFlight = false;

/**
 * Resume Facebook sign-in after WebView reload (native token injected on page load).
 * Mirrors bootstrapPendingGoogleSignIn — fixes login completing outside the app tab.
 */
export async function bootstrapPendingFacebookSignIn(): Promise<boolean> {
  if (!isNativeAmyNestAndroidWrapper() || pendingFacebookBootstrapInFlight) {
    return false;
  }
  const {
    readPendingNativeFacebookAccessToken,
    isFacebookSignInInFlight,
  } = await import("@/lib/native-auth");
  if (isFacebookSignInInFlight()) {
    console.info(`${FACEBOOK_TAG} bootstrap skipped — sign-in in flight`);
    return false;
  }
  const accessToken = readPendingNativeFacebookAccessToken();
  if (!accessToken) return false;

  console.info(`${FACEBOOK_TAG} bootstrap pending facebook token`);
  pendingFacebookBootstrapInFlight = true;
  try {
    await completeFacebookAccessTokenSignIn(accessToken);
    const dest = await finishFacebookLoginFlow();
    console.info(`${FACEBOOK_TAG} bootstrap navigate`, { dest });
    return true;
  } catch (err) {
    logFirebaseAuthError("facebook:bootstrap-pending", err);
    return false;
  } finally {
    pendingFacebookBootstrapInFlight = false;
  }
}

/**
 * Play Store WebView — native Facebook SDK via AuthBridge.kt.
 * Never use popup/redirect OAuth here: Firebase Web OAuth in Play WebView causes auth/argument-error.
 */
export async function loginAndroidWebViewFacebook(): Promise<string> {
  console.info(`${FACEBOOK_TAG} android webview flow start`, {
    href: typeof window !== "undefined" ? window.location.href : "",
    bridgeVersion:
      typeof window !== "undefined"
        ? (window as Window & { __AMYNEST_AUTH?: string }).__AMYNEST_AUTH
        : undefined,
  });
  const {
    probeFacebookBridgeAvailability,
    signInWithFacebookViaNativeBridge,
    logNativeAuthDiagnostics,
  } = await import("@/lib/native-auth");
  const bridgeReady = await probeFacebookBridgeAvailability();
  console.info(`${FACEBOOK_TAG} facebook bridge probe`, { bridgeReady });
  if (bridgeReady === false) {
    throw Object.assign(
      new Error(
        "Facebook Sign-In native bridge is not ready. Close and reopen the app, then try again.",
      ),
      { code: "app/facebook-bridge-unavailable" },
    );
  }
  void logNativeAuthDiagnostics();
  const { accessToken } = await signInWithFacebookViaNativeBridge();
  console.info(`${FACEBOOK_TAG} access token received, signing into Firebase`, {
    tokenLen: accessToken.length,
  });
  await signInFirebaseWithFacebookAccessToken(accessToken);
  const dest = await finishFacebookLoginFlow({ skipNavigation: true });
  console.info(`${FACEBOOK_TAG} android webview facebook sign-in success`, { dest });
  return dest;
}

/** Native Android bridge first; Capacitor iOS uses redirect; web/PWA uses popup+redirect. */
export async function handleFacebookLogin(): Promise<string | void> {
  if (isNativeAmyNestAndroidWrapper()) {
    return loginAndroidWebViewFacebook();
  }
  if (shouldUseCapacitorIosFacebookAuth()) {
    return loginCapacitorIosFacebook();
  }
  if (isCapacitorIosShell()) {
    throw Object.assign(
      new Error(
        "Facebook Sign-In requires the latest AmyNest iOS app build. Update the app, then try again.",
      ),
      { code: "app/facebook-ios-plugin-unavailable" },
    );
  }
  if (isNativeAmyNestShell()) {
    throw Object.assign(
      new Error(
        "Facebook Sign-In must use the in-app login dialog. Update the app from the Play Store and try again.",
      ),
      { code: "app/facebook-native-required" },
    );
  }
  return loginWithWebFallback();
}
