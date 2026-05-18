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
