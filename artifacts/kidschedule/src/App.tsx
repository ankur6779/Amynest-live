import { lazy, Suspense, useEffect, useRef } from "react";
import { AuthBootShell } from "@/components/auth-boot-shell";
import DebugOverlay from "@/components/DebugOverlay";
import { StaticAudioTestButton } from "@/components/static-audio-test-button";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ReactInstanceRecovery } from "@/components/react-instance-recovery";
import { safeImportModule } from "@/lib/safe-import";

// Everything heavy — Firebase Auth, React Query, i18n providers, the
// router, every page route, the Layout shell — lives in AppCore. By
// lazy-loading it here we keep the eager bundle minimal so iOS Safari's
// WebContent process on memory-constrained iPhones (e.g. iPhone 13
// with 4 GB RAM) doesn't get killed by Jetsam during initial parse +
// React mount. The splash screen rendered by index.html stays visible
// until AppCore loads and renders, so there's no blank-screen flash.
const AppCore = lazy(() =>
  safeImportModule(() => import("./AppCore"), "./AppCore"),
);

declare global {
  interface Window {
    __amynestMark?: (phase: string) => void;
  }
}

function App() {
  const appMountLoggedRef = useRef(false);
  useEffect(() => {
    if (appMountLoggedRef.current) return;
    appMountLoggedRef.current = true;
    console.log("APP MOUNTED");
  }, []);

  // Suspense fallback is `null` rather than a spinner because the
  // index.html splash screen is still visible at this point — it's not
  // dismissed until BOTH the splash min-time has elapsed AND
  // `__amynestAppCoreReady` is true (see main.tsx). That readiness
  // gate means the splash always covers the lazy AppCore download, so
  // the user never sees a blank Suspense fallback even on slow networks.
  return (
    <>
      <DebugOverlay />
      <StaticAudioTestButton />
      <ErrorBoundary label="root">
        <ReactInstanceRecovery>
          <Suspense fallback={<AuthBootShell />}>
            <AppCore />
          </Suspense>
        </ReactInstanceRecovery>
      </ErrorBoundary>
    </>
  );
}

export default App;
