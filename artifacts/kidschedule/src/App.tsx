import { lazy, Suspense, useEffect } from "react";
import { devLog } from "@/lib/dev-log";
import { initAudioUnlock } from "@/lib/tts-guard";
import { AuthBootShell } from "@/components/auth-boot-shell";
import DebugOverlay from "@/components/DebugOverlay";
import { StaticAudioTestButton } from "@/components/static-audio-test-button";
import { ReactInstanceRecovery } from "@/components/react-instance-recovery";
import { safeImportModule } from "@/lib/safe-import";
import { isLowMemoryIosClient } from "@/lib/device-lite";

/** Brief pause after lite splash so iOS can reclaim splash GPU layers before AppCore parse. */
const IOS_LOW_MEMORY_BOOT_DELAY_MS = 350;

function loadAppCore() {
  const load = () => safeImportModule(() => import("./AppCore"), "./AppCore");
  if (!isLowMemoryIosClient()) return load();
  return new Promise<Awaited<ReturnType<typeof load>>>((resolve, reject) => {
    window.setTimeout(() => {
      void load().then(resolve, reject);
    }, IOS_LOW_MEMORY_BOOT_DELAY_MS);
  });
}

// Everything heavy — Firebase Auth, React Query, i18n providers, the
// router, every page route, the Layout shell — lives in AppCore. By
// lazy-loading it here we keep the eager bundle minimal so iOS Safari's
// WebContent process on memory-constrained iPhones (e.g. iPhone 13
// with 4 GB RAM) doesn't get killed by Jetsam during initial parse +
// React mount. The splash screen rendered by index.html stays visible
// until AppCore loads and renders, so there's no blank-screen flash.
const AppCore = lazy(() => loadAppCore());

declare global {
  interface Window {
    __amynestMark?: (phase: string) => void;
  }
}

function App() {
  useEffect(() => {
    devLog("APP MOUNTED");
    initAudioUnlock();
  }, []);

  // Suspense fallback is `null` rather than a spinner because the
  // index.html splash screen is still visible at this point — it's not
  // dismissed until BOTH the splash min-time has elapsed AND
  // `__amynestAppCoreReady` is true (see main.tsx). That readiness
  // gate means the splash always covers the lazy AppCore download, so
  // the user never sees a blank Suspense fallback even on slow networks.
  return (
    <div id="app-root" className="app-root w-full max-w-full min-w-0">
      <div className="app-scroll page-content">
        <DebugOverlay />
        <StaticAudioTestButton />
        {/* ErrorBoundary disabled temporarily while verifying QueryClientProvider fix */}
        <ReactInstanceRecovery>
          <Suspense fallback={<AuthBootShell />}>
            <AppCore />
          </Suspense>
        </ReactInstanceRecovery>
      </div>
    </div>
  );
}

export default App;
