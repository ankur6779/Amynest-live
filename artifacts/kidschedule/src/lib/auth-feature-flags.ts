/**
 * Temporary auth UI toggles — flip when OAuth console setup is complete.
 * Code for Google/Apple/phone stays in the repo; only visibility changes.
 */
export const ENABLE_OAUTH_SIGN_IN = false;
/** Apple Sign-In (native iOS Capacitor + web Services ID). */
export const ENABLE_APPLE_SIGN_IN = true;
/** Google Sign-In — Android WebView bridge + web redirect. */
export const ENABLE_GOOGLE_SIGN_IN = true;
export const ENABLE_PHONE_OTP = true;

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
