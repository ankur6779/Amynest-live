import { Suspense, useEffect, useState } from "react";
import { isAndroidInstalledPwa } from "@/lib/pwa-android-permissions";
import { lazyPage } from "@/lib/safe-import";

const PwaAndroidPermissionsGate = lazyPage(() =>
  import("@/components/pwa-android-permissions-gate").then((m) => ({
    default: m.PwaAndroidPermissionsGate,
  })),
);

/** Android installed PWA only — lazy so other clients never load this chunk at boot. */
export function PwaAndroidPermissionsGateLazy() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAndroidInstalledPwa()) return;
    const timer = window.setTimeout(() => setReady(true), 500);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <PwaAndroidPermissionsGate />
    </Suspense>
  );
}
