import { isCapacitorNative } from "@/lib/capacitor-native";

/**
 * Subtle tactile pulse fired as a page transition begins. Gives in-app
 * navigation a native, premium feel. Best-effort: uses the Capacitor Haptics
 * plugin on native shells and falls back to the Web Vibration API elsewhere
 * (e.g. the Android WebView wrapper). Silently no-ops when neither is present.
 */
export function hapticNavTransition(): void {
  try {
    if (isCapacitorNative()) {
      void import("@capacitor/haptics")
        .then(({ Haptics, ImpactStyle }) =>
          Haptics.impact({ style: ImpactStyle.Light }),
        )
        .catch(() => {
          /* plugin optional */
        });
      return;
    }
  } catch {
    /* fall through to web vibration */
  }

  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(8);
    }
  } catch {
    /* vibration unsupported — ignore */
  }
}
