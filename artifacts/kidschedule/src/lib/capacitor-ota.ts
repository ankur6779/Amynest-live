import { isCapacitorNative } from "@/lib/capacitor-native";
import { devLog } from "@/lib/dev-log";

/**
 * Capgo OTA (patch-only web bundle updates).
 * Native shell must include @capgo/capacitor-updater (amynest-capacitor).
 *
 * Apple Guideline 2.5.2: server only offers same-major.minor patch bumps;
 * major features still ship via App Store.
 */
export async function initCapacitorOta(): Promise<void> {
  if (!isCapacitorNative()) return;

  try {
    const { CapacitorUpdater } = await import("@capgo/capacitor-updater");
    // Required after each successful load — without this, Capgo may roll back.
    await CapacitorUpdater.notifyAppReady();
    devLog("[OTA] notifyAppReady");
  } catch (err) {
    devLog("[OTA] init skipped or failed", err);
  }
}
