/**
 * V2 craft haptics — thin wrappers over existing navigation / Capacitor haptics.
 * No new haptic engine. Respects reduced motion.
 */

import { isCapacitorNative } from "@/lib/capacitor-native";
import { hapticNavTransition } from "@/lib/navigation-haptics";

/** Light selection / press — reuses nav transition haptic. */
export function v2HapticLight(reducedMotion = false): void {
  if (reducedMotion) return;
  hapticNavTransition();
}

/** Calm success pulse (mission / premium) — Capacitor notification or short vibrate. */
export function v2HapticSuccess(reducedMotion = false): void {
  if (reducedMotion) return;
  try {
    if (isCapacitorNative()) {
      void import("@capacitor/haptics")
        .then(({ Haptics, NotificationType }) =>
          Haptics.notification({ type: NotificationType.Success }),
        )
        .catch(() => {
          hapticNavTransition();
        });
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([12, 30, 12]);
    }
  } catch {
    /* unsupported */
  }
}
