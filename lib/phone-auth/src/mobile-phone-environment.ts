import { getCanonicalWebOrigin } from "./site-domain";

type AmyNestWindow = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
  __AMYNEST_WRAPPER?: string;
  AndroidPush?: unknown;
  AmyNestPushNative?: unknown;
};

/** Installed PWA (Add to Home Screen) — reCAPTCHA must not run inside standalone WebView. */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;

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

/** Never run reCAPTCHA inside installed PWA — use system browser instead. */
export function canRunInAppPhoneRecaptcha(): boolean {
  return !isStandalonePwa();
}

export function shouldUseBrowserForPhoneOtp(): boolean {
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
  console.info("[phone-otp] Opening system browser for OTP (standalone PWA)", url);
  window.location.assign(url);
}
