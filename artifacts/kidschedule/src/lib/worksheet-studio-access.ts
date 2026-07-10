import { isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";

/** True when running inside Capacitor iOS/Android or Play Store WebView. */
export function isAmyNestNativeAppShell(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cap = (
      window as Window & {
        Capacitor?: { isNativePlatform?: () => boolean };
      }
    ).Capacitor;
    if (cap?.isNativePlatform?.()) return true;
  } catch {
    /* ignore */
  }
  return isNativeAmyNestAndroidWrapper();
}

/** AmyNest installed app only — mobile browsers (Safari, Chrome, etc.) are allowed. */
export function isWorksheetStudioBlockedClient(): boolean {
  if (typeof window === "undefined") return false;
  return isAmyNestNativeAppShell();
}

export function isWorksheetStudioClientAllowed(): boolean {
  return !isWorksheetStudioBlockedClient();
}
