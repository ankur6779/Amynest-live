import { getCanonicalWebOrigin } from "./site-domain";

type AmyNestWindow = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
  __AMYNEST_WRAPPER?: string;
  AndroidPush?: unknown;
  AmyNestPushNative?: unknown;
};

/**
 * Mobile WebViews and iOS Safari often crash when Firebase loads
 * invisible reCAPTCHA in a 1×1 / off-screen iframe.
 */
export function isMobilePhoneOtpEnvironment(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const win = window as AmyNestWindow;
  const ua = navigator.userAgent || "";

  if (win.Capacitor?.isNativePlatform?.() === true) return true;
  if (typeof win.__AMYNEST_WRAPPER === "string") return true;
  if (win.AndroidPush != null || win.AmyNestPushNative != null) return true;
  if (/AmyNestAndroid/i.test(ua)) return true;
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

/** Installed PWA / Add-to-Home-Screen on Android — reCAPTCHA iframe kills the process. */
export function isAndroidPwa(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  if (!/Android/i.test(navigator.userAgent || "")) return false;

  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
    if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  } catch {
    /* ignore */
  }

  if (document.referrer.startsWith("android-app://")) return true;

  return false;
}

/**
 * Firebase reCAPTCHA must NOT run inside Android installed PWA WebView — process crash.
 * Use Chrome / system browser for phone OTP instead.
 */
export function canRunInAppPhoneRecaptcha(): boolean {
  return !isAndroidPwa();
}

/** @deprecated Use canRunInAppPhoneRecaptcha — inverted. */
export function shouldUseBrowserForPhoneOtp(): boolean {
  return isAndroidPwa();
}

export function buildPhoneOtpBrowserUrl(phoneE164: string, returnPath = "/sign-in"): string {
  const origin = getCanonicalWebOrigin();
  const url = new URL(returnPath, origin);
  url.searchParams.set("phoneOtp", "1");
  url.searchParams.set("phone", phoneE164);
  return url.toString();
}

/**
 * Leave standalone PWA and open sign-in in the system browser (Chrome).
 * Required for phone OTP on Android — reCAPTCHA cannot run in the PWA WebView.
 */
export function openPhoneOtpInExternalBrowser(
  phoneE164: string,
  returnPath = "/sign-in",
): void {
  const url = buildPhoneOtpBrowserUrl(phoneE164, returnPath);
  console.info("[phone-otp] Opening system browser for OTP (Android PWA)", url);
  window.location.assign(url);
}

/** Never warm up reCAPTCHA in Android PWA — iframe load crashes the app. */
export function shouldPreRenderPhoneRecaptcha(): boolean {
  return canRunInAppPhoneRecaptcha();
}
