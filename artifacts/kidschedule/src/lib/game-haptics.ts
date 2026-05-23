import { Capacitor } from "@capacitor/core";

/** Light success pulse on native shells; falls back to Vibration API on web. */
export async function hapticGameSuccess(perfect = false): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
      if (perfect) {
        await Haptics.notification({ type: NotificationType.Success });
      } else {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
      return;
    }
  } catch {
    /* plugin optional */
  }
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(perfect ? [20, 40, 20] : 15);
    }
  } catch {
    /* ignore */
  }
}
