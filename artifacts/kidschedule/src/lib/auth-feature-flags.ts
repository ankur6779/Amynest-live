import {
  shouldUseAndroidWebViewGoogleAuth,
  shouldUseNativeGoogleAuth,
} from "@/lib/google-auth";

/**
 * Temporary auth UI toggles — flip when OAuth console setup is complete.
 * Code for Google/Apple/phone stays in the repo; only visibility changes.
 */
export const ENABLE_OAUTH_SIGN_IN = false;
/** Apple Sign-In (native iOS Capacitor + web Services ID). */
export const ENABLE_APPLE_SIGN_IN = true;
/** Google Sign-In on web — set true when web OAuth redirect is stable in production. */
export const ENABLE_GOOGLE_SIGN_IN = false;
export const ENABLE_PHONE_OTP = true;

export function shouldShowPhoneOtp(): boolean {
  return ENABLE_PHONE_OTP;
}

/**
 * Google button on native Android shells (Play WebView + Capacitor) even when web OAuth is off.
 * WebView must use native sign-in — popup/redirect breaks with auth/argument-error.
 */
export function shouldShowGoogleSignIn(): boolean {
  if (ENABLE_GOOGLE_SIGN_IN) return true;
  if (typeof window === "undefined") return false;
  try {
    return shouldUseNativeGoogleAuth() || shouldUseAndroidWebViewGoogleAuth();
  } catch {
    return false;
  }
}

/** Apple button must always show in Capacitor iOS (App Store review). */
export function shouldShowAppleSignIn(): boolean {
  if (ENABLE_APPLE_SIGN_IN) return true;
  if (typeof window === "undefined") return ENABLE_APPLE_SIGN_IN;
  try {
    const cap = (
      window as Window & {
        Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
      }
    ).Capacitor;
    return cap?.isNativePlatform?.() === true && cap.getPlatform?.() === "ios";
  } catch {
    return false;
  }
}
