/** Capacitor runtime check without importing @capacitor/core (smaller / safer on Android PWA). */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cap = (
      window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor;
    return cap?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}
