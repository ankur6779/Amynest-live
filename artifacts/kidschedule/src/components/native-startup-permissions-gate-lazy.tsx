import { lazy, Suspense, useEffect, useState } from "react";
import { isCapacitorNativeShell } from "@/lib/native-shell";

const NativeStartupPermissionsGate = lazy(() =>
  import("@/components/native-startup-permissions-gate").then((m) => ({
    default: m.NativeStartupPermissionsGate,
  })),
);

/**
 * Capacitor-only permissions UI — lazy-loaded so Android PWA / WebView APK
 * never evaluate @capacitor/app|geolocation|push-notifications at AppCore boot.
 */
export function NativeStartupPermissionsGateLazy() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isCapacitorNativeShell()) return;
    const timer = window.setTimeout(() => setReady(true), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <NativeStartupPermissionsGate />
    </Suspense>
  );
}
