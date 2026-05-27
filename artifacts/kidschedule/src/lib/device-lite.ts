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
    const modes = ["standalone", "fullscreen", "minimal-ui"] as const;
    for (const mode of modes) {
      if (window.matchMedia?.(`(display-mode: ${mode})`)?.matches) return true;
    }
    return (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

/** Installed PWA or Play Store WebView on Android. */
export function isAndroidInstalledAmyNestApp(): boolean {
  if (!isAndroidUa()) return false;
  return isStandalonePwa() || isNativeAmyNestAndroidWrapper();
}

/** Android Chrome installed PWA only (not Play WebView, not Capacitor). */
export function isAndroidInstalledPwa(): boolean {
  if (typeof window === "undefined") return false;
  if (!isAndroidUa() || !isStandalonePwa()) return false;
  if (isNativeAmyNestAndroidWrapper()) return false;
  try {
    const cap = (
      window as Window & {
        Capacitor?: { isNativePlatform?: () => boolean };
      }
    ).Capacitor;
    if (cap?.isNativePlatform?.()) return false;
  } catch {
    /* ignore */
  }
  return true;
}

function isCapacitorAndroid(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cap = (
      window as Window & {
        Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
      }
    ).Capacitor;
    return cap?.isNativePlatform?.() === true && cap.getPlatform?.() === "android";
  } catch {
    return false;
  }
}

/**
 * Android Chrome, installed PWA, or Play Store WebView wrapper (not Capacitor).
 * All Android clients use the same scroll containment path because Chrome's
 * native pull-to-refresh can fight document-level scrolling.
 */
export function isAndroidMobileShell(): boolean {
  if (typeof window === "undefined") return false;
  return isAndroidUa();
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

/**
 * All Android AmyNest surfaces — Chrome tab, installed PWA, Play WebView, Capacitor.
 * Shares gesture priming, relaxed playback watchdog, and no crossOrigin on remote MP3.
 */
export function isAndroidAmyNestAudioClient(): boolean {
  return isAndroidUa();
}

/** True when index.html boot script enabled lite-splash (Android / iOS / crash recovery). */
export function hasLiteSplashBoot(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("lite-splash");
}

export function isIosUa(): boolean {
  if (typeof navigator === "undefined") return false;
  try {
    const ua = navigator.userAgent || "";
    return (
      /iPad|iPhone|iPod/.test(ua) ||
      (/Mac/.test(ua) &&
        typeof navigator.maxTouchPoints === "number" &&
        navigator.maxTouchPoints > 1)
    );
  } catch {
    return false;
  }
}

/** Capacitor iOS shell (WKWebView) — same 4 GB RAM budget as mobile Safari. */
export function isCapacitorIosShell(): boolean {
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

/**
 * iPhone 13 / mini / SE and similar 4 GB devices — defer heavy JS until
 * after splash teardown so Jetsam does not kill WebContent mid-boot.
 */
export function isLowMemoryIosClient(): boolean {
  if (typeof window === "undefined") return false;
  if (!isIosUa() && !isCapacitorIosShell()) return false;
  if (hasLiteSplashBoot() || isCapacitorIosShell()) return true;
  const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof dm === "number" && dm <= 4;
}

/**
 * Android browser or installed PWA — use reduced dashboard / defer heavy layers.
 * Also true on iOS lite-splash boots (4 GB iPhones).
 */
export function isAndroidLiteClient(): boolean {
  if (typeof window === "undefined") return false;
  if (hasLiteSplashBoot()) return true;
  return isAndroidUa();
}

/** @deprecated use isAndroidLiteClient — kept for call-site clarity on iOS. */
export function isMobileLiteClient(): boolean {
  return isAndroidLiteClient();
}
