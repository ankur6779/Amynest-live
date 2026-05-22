import { isNativeAmyNestShell } from "@/lib/native-shell";

const AMYNEST_WEB_ORIGIN = "https://www.amynest.in";
const ANDROID_PACKAGE = "com.amynest.app";

/** Verification link opened in Gmail/Chrome, not inside the Android/iOS app WebView. */
export function isEmailLinkOpenedInExternalBrowser(): boolean {
  return !isNativeAmyNestShell();
}

/** HTTPS (App Link) or Android intent URL to reopen the installed AmyNest app. */
export function buildOpenAmyNestAppUrl(path = "/"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const httpsUrl = `${AMYNEST_WEB_ORIGIN}${cleanPath}`;

  if (typeof navigator === "undefined") {
    return httpsUrl;
  }

  if (/android/i.test(navigator.userAgent)) {
    const hostPath = `www.amynest.in${cleanPath}`;
    return (
      `intent://${hostPath}#Intent;` +
      `scheme=https;package=${ANDROID_PACKAGE};` +
      `S.browser_fallback_url=${encodeURIComponent(httpsUrl)};end`
    );
  }

  return httpsUrl;
}

/** Best-effort return to the mail app / previous screen after verification. */
export function tryReturnToInbox(): void {
  if (typeof window === "undefined") return;
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  try {
    window.close();
  } catch {
    /* Tab was not opened by script — user closes manually */
  }
}
