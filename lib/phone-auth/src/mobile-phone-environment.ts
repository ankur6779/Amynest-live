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

/** Installed PWA / Add-to-Home-Screen on Android — reCAPTCHA iframe often kills the process. */
export function isAndroidPwa(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  if (!/Android/i.test(navigator.userAgent || "")) return false;

  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
  } catch {
    /* ignore */
  }

  if (document.referrer.startsWith("android-app://")) return true;

  return false;
}

/** Prefer opening system Chrome for phone OTP (avoids standalone WebView crashes). */
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

/** Android PWA: pre-render iframe crashes WebView — render only on Send OTP. */
export function shouldPreRenderPhoneRecaptcha(): boolean {
  return !isAndroidPwa();
}
