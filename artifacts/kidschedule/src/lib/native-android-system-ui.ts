import { isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";

type AndroidSystemUiBridge = {
  showSystemUI?: () => void;
  hideSystemUI?: () => void;
};

function getAndroidSystemUiBridge(): AndroidSystemUiBridge | null {
  if (typeof window === "undefined" || !isNativeAmyNestAndroidWrapper()) return null;
  const bridge = (window as Window & { Android?: AndroidSystemUiBridge }).Android;
  if (!bridge?.showSystemUI || !bridge?.hideSystemUI) return null;
  return bridge;
}

/** Sync Android system bar visibility with dashboard vs immersive routes. */
export function syncAndroidSystemUi(showSystemUi: boolean): void {
  const bridge = getAndroidSystemUiBridge();
  if (!bridge) return;
  try {
    if (showSystemUi) {
      bridge.showSystemUI!();
    } else {
      bridge.hideSystemUI!();
    }
  } catch (e) {
    console.warn("[amynest:system-ui] native bridge call failed", e);
  }
}
