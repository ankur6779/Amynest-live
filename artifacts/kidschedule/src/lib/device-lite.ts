/**
 * Memory-tight clients (Android PWA / WebView) — skip heavy hero animations
 * and other GPU-heavy boot work that can kill the WebView after splash.
 */

export function isAndroidUa(): boolean {
  if (typeof navigator === "undefined") return false;
  try {
    return /android/i.test(navigator.userAgent);
  } catch {
    return false;
  }
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(display-mode: standalone)")?.matches) return true;
    return (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

/**
 * Installed Android PWA (Chrome standalone / TWA) or legacy AmyNestAndroid WebView.
 * Used for viewport containment and document-level scrolling (same as Capacitor iOS).
 */
export function isAndroidMobileShell(): boolean {
  if (typeof window === "undefined") return false;
  if (!isAndroidUa()) return false;
  return isStandalonePwa() || isNativeAmyNestAndroidWrapper();
}

/** Legacy kidschedule-android WebView (not Capacitor). */
export function isNativeAmyNestAndroidWrapper(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (typeof (window as Window & { __AMYNEST_WRAPPER?: string }).__AMYNEST_WRAPPER === "string") {
      return true;
    }
    return /AmyNestAndroid/.test(navigator.userAgent);
  } catch {
    return false;
  }
}

/** True when index.html boot script enabled lite-splash (Android / iOS / crash recovery). */
export function hasLiteSplashBoot(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("lite-splash");
}

/**
 * Android browser or installed PWA — use reduced dashboard / defer heavy layers.
 */
export function isAndroidLiteClient(): boolean {
  if (typeof window === "undefined") return false;
  if (hasLiteSplashBoot()) return true;
  return isAndroidUa();
}
