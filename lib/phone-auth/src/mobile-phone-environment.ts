type AmyNestWindow = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
  __AMYNEST_WRAPPER?: string;
  AndroidPush?: unknown;
  AmyNestPushNative?: unknown;
};

/**
 * Mobile WebViews and iOS Safari often crash (process kill) when Firebase loads
 * invisible reCAPTCHA in a 1×1 / off-screen iframe. Use visible compact mode.
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

/** Desktop-only pre-render — mobile pre-render has caused WebContent crashes. */
export function shouldPreRenderPhoneRecaptcha(): boolean {
  return !isMobilePhoneOtpEnvironment();
}
