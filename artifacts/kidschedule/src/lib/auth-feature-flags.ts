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
/** Capacitor iOS Google Sign-In (@codetrix-studio/capacitor-google-auth). */
export const ENABLE_CAPACITOR_IOS_GOOGLE_SIGN_IN = true;
/** Capacitor iOS Facebook Sign-In (Firebase OAuth). */
export const ENABLE_CAPACITOR_IOS_FACEBOOK_SIGN_IN = true;
export const ENABLE_PHONE_OTP = true;

export function shouldShowPhoneOtp(): boolean {
  if (isCapacitorIos()) return false;
  return ENABLE_PHONE_OTP;
}

function isCapacitorIos(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cap = (
      window as Window & {
        Capacitor?: {
          isNativePlatform?: () => boolean;
          getPlatform?: () => string;
          isPluginAvailable?: (pluginName: string) => boolean;
        };
      }
    ).Capacitor;
    return cap?.isNativePlatform?.() === true && cap.getPlatform?.() === "ios";
  } catch {
    return false;
  }
}

function isCapacitorPluginAvailable(pluginName: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window as Window & {
        Capacitor?: { isPluginAvailable?: (name: string) => boolean };
      }
    ).Capacitor?.isPluginAvailable?.(pluginName) === true;
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
 * Google Sign-In — show on Play Store WebView Android, mobile web, PWA, and
 * Capacitor iOS only when the native GoogleAuth plugin is actually registered.
 */
export function shouldShowGoogleSignIn(): boolean {
  if (!ENABLE_GOOGLE_SIGN_IN) return false;
  if (isCapacitorIos()) {
    return ENABLE_CAPACITOR_IOS_GOOGLE_SIGN_IN && isCapacitorPluginAvailable("GoogleAuth");
  }
  return true;
}

/** Facebook Sign-In — web, PWA, Play WebView Android, and gated Capacitor iOS. */
export function shouldShowFacebookSignIn(): boolean {
  if (!ENABLE_FACEBOOK_SIGN_IN) return false;
  if (isCapacitorIos()) return ENABLE_CAPACITOR_IOS_FACEBOOK_SIGN_IN;
  return true;
}

/** Native GoogleAuth plugin — Capacitor iOS only, when explicitly enabled. */
export function shouldUseCapacitorIosGoogleAuth(): boolean {
  return (
    isCapacitorIos() &&
    ENABLE_CAPACITOR_IOS_GOOGLE_SIGN_IN &&
    isCapacitorPluginAvailable("GoogleAuth")
  );
}
