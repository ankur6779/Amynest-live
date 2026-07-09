import { Capacitor } from "@capacitor/core";

export async function hapticWorksheetTap(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Light });
      return;
    }
  } catch { /* optional */ }
  try {
    navigator.vibrate?.(12);
  } catch { /* ignore */ }
}

export async function hapticWorksheetSuccess(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Haptics, NotificationType } = await import("@capacitor/haptics");
      await Haptics.notification({ type: NotificationType.Success });
      return;
    }
  } catch { /* optional */ }
  try {
    navigator.vibrate?.([15, 30, 15]);
  } catch { /* ignore */ }
}
