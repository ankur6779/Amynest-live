/**
 * Temporary auth UI toggles — flip when OAuth console setup is complete.
 * Code for Google/Apple/phone stays in the repo; only visibility changes.
 */
export const ENABLE_OAUTH_SIGN_IN = true;
/** Apple Sign-In (native iOS Capacitor + web Services ID). */
export const ENABLE_APPLE_SIGN_IN = true;
/** Google Sign-In master switch — actual visibility is platform-gated via shouldShowGoogleSignIn(). */
export const ENABLE_GOOGLE_SIGN_IN = true;
/** Facebook Sign-In (Firebase OAuth — web + Play WebView). */
export const ENABLE_FACEBOOK_SIGN_IN = true;
export const ENABLE_PHONE_OTP = true;

export function shouldShowPhoneOtp(): boolean {
  return ENABLE_PHONE_OTP;
}

function isCapacitorIos(): boolean {
  if (typeof window === "undefined") return false;
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

/** Apple button must always show in Capacitor iOS (App Store review). */
export function shouldShowAppleSignIn(): boolean {
  if (ENABLE_APPLE_SIGN_IN) return true;
  return isCapacitorIos();
}

/**
 * Google Sign-In — show on Play Store WebView Android, mobile web, and PWA.
 * Hidden on Capacitor iOS (Apple Sign-In is primary there).
 */
export function shouldShowGoogleSignIn(): boolean {
  if (!ENABLE_GOOGLE_SIGN_IN) return false;
  return !isCapacitorIos();
}

/** Facebook Sign-In — web, PWA, and Play WebView Android. Hidden on Capacitor iOS. */
export function shouldShowFacebookSignIn(): boolean {
  if (!ENABLE_FACEBOOK_SIGN_IN) return false;
  return !isCapacitorIos();
}
