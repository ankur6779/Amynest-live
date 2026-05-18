import { Capacitor } from "@capacitor/core";

/** True when running inside Capacitor iOS/Android (not browser PWA). */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.isNativePlatform() === true;
  } catch {
    return false;
  }
}
