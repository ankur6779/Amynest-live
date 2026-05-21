import { getCanonicalWebOrigin } from "./site-domain";

type AmyNestWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
  };
  __AMYNEST_WRAPPER?: string;
  AndroidPush?: unknown;
  AmyNestPushNative?: unknown;
};

/**
 * Capacitor iOS/Android shell or legacy kidschedule-android WebView APK.
 * OTP + invisible reCAPTCHA must run in-app for these environments.
 */
export function isNativePhoneAuthShell(): boolean {
  if (typeof window === "undefined") return false;

  const win = window as AmyNestWindow;
  const proto = window.location?.protocol ?? "";

  if (proto === "capacitor:" || proto === "ionic:") return true;
  if (win.Capacitor?.isNativePlatform?.() === true) return true;
  if (typeof win.__AMYNEST_WRAPPER === "string") return true;
  if (win.AndroidPush != null || win.AmyNestPushNative != null) return true;

  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent || "";
    if (/AmyNestAndroid/i.test(ua)) return true;
  }

  return false;
}

/** Installed PWA (Add to Home Screen) in a mobile browser — not a native wrapper. */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;

  // Native shells may still report standalone display-mode; never treat them as PWA-only.
  if (isNativePhoneAuthShell()) return false;

  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
    if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  } catch {
    /* ignore */
  }

  if (typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    const nav = navigator as Navigator & { standalone?: boolean };
    if (nav.standalone === true) return true;
  }

  return false;
}

/** @deprecated Use isStandalonePwa */
export function isAndroidPwa(): boolean {
  if (!isStandalonePwa()) return false;
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

export function isMobilePhoneOtpEnvironment(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  if (isNativePhoneAuthShell()) return true;

  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
  if (/Mac/.test(ua) && navigator.maxTouchPoints > 1) return true;

  try {
    if (
      window.matchMedia("(pointer: coarse)").matches &&
      !window.matchMedia("(hover: hover)").matches
    ) {
      return true;
    }
  } catch {
    /* ignore */
  }

  return false;
}

/** True when in-app invisible reCAPTCHA + Firebase phone auth should run. */
export function canRunInAppPhoneRecaptcha(): boolean {
  if (isNativePhoneAuthShell()) return true;
  return true;
}

/**
 * Never force OTP through an external browser (Capacitor / WebView must stay in-app).
 * @deprecated Prefer {@link shouldSuggestBrowserOtpFallback} for optional fallback UI.
 */
export function shouldUseBrowserForPhoneOtp(): boolean {
  return false;
}

/** Optional "Continue in browser" after a failed in-app attempt (installed PWA only). */
export function shouldSuggestBrowserOtpFallback(): boolean {
  if (isNativePhoneAuthShell()) return false;
  return isStandalonePwa();
}

export function buildPhoneOtpBrowserUrl(phoneE164: string, returnPath = "/sign-in"): string {
  const origin = getCanonicalWebOrigin();
  const url = new URL(returnPath, origin);
  url.searchParams.set("phoneOtp", "1");
  url.searchParams.set("phone", phoneE164);
  return url.toString();
}

export function openPhoneOtpInExternalBrowser(
  phoneE164: string,
  returnPath = "/sign-in",
): void {
  const url = buildPhoneOtpBrowserUrl(phoneE164, returnPath);
  console.info("[phone-otp] Opening browser tab for OTP fallback", url);
  window.location.assign(url);
}
