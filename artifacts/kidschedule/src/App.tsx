import { lazy, Suspense, useEffect } from "react";
import { markAppShellReady, trackStartupEvent } from "@/lib/startup-orchestrator";
import { devLog } from "@/lib/dev-log";
import { initAudioUnlock } from "@/lib/tts-guard";
import { AuthBootShell } from "@/components/auth-boot-shell";
import DebugOverlay from "@/components/DebugOverlay";
import { ReactInstanceRecovery } from "@/components/react-instance-recovery";
import { StartupWatchdogGate } from "@/components/startup-watchdog-gate";
import { safeImportModule } from "@/lib/safe-import";
import { isLowMemoryIosClient } from "@/lib/device-lite";
import {
  diagnosticsToTelemetry,
  logStartupDiagnostics,
} from "@/lib/startup-diagnostics";

/** Brief pause after lite splash so iOS can reclaim splash GPU layers before AppCore parse. */
const IOS_LOW_MEMORY_BOOT_DELAY_MS = 350;

/**
 * Hard ceiling on the lazy AppCore chunk fetch. A *thrown* stale-chunk error is
 * handled by `safeImportModule`, but a silent *hang* (promise never settles) is
 * not — and that is exactly what happens on flaky OEM Android WebViews. Without
 * this ceiling the Suspense fallback ("Loading AmyNest…") shows forever. On
 * timeout we reject so the ReactInstanceRecovery boundary runs bounded
 * cache-clear auto-recovery. The 10s StartupWatchdogGate surfaces actionable
 * Retry/Continue buttons first, so the user is never left waiting in silence.
 */
const APPCORE_IMPORT_TIMEOUT_MS = 20_000;

function loadAppCore() {
  const load = () => safeImportModule(() => import("./AppCore"), "./AppCore");
  if (!isLowMemoryIosClient()) return load();
  return new Promise<Awaited<ReturnType<typeof load>>>((resolve, reject) => {
    window.setTimeout(() => {
      void load().then(resolve, reject);
    }, IOS_LOW_MEMORY_BOOT_DELAY_MS);
  });
}

function loadAppCoreWithTimeout() {
  type AppCoreModule = Awaited<ReturnType<typeof loadAppCore>>;
  return new Promise<AppCoreModule>((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      const diag = logStartupDiagnostics("appcore_import_timeout");
      trackStartupEvent("startup_timeout", {
        stage: "appcore_import",
        ...diagnosticsToTelemetry(diag),
      });
      reject(
        new Error(
          "AppCore chunk did not load in time — recovering (check your connection).",
        ),
      );
    }, APPCORE_IMPORT_TIMEOUT_MS);

    void loadAppCore().then(
      (mod) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(mod);
      },
      (err) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

// Everything heavy — Firebase Auth, React Query, i18n providers, the
// router, every page route, the Layout shell — lives in AppCore. By
// lazy-loading it here we keep the eager bundle minimal so iOS Safari's
// WebContent process on memory-constrained iPhones (e.g. iPhone 13
// with 4 GB RAM) doesn't get killed by Jetsam during initial parse +
// React mount. The splash screen rendered by index.html stays visible
// until AppCore loads and renders, so there's no blank-screen flash.
const AppCore = lazy(() => loadAppCoreWithTimeout());

declare global {
  interface Window {
    __amynestMark?: (phase: string) => void;
  }
}

function App() {
  useEffect(() => {
    devLog("APP MOUNTED");
    markAppShellReady();
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
        <StartupWatchdogGate>
          <ReactInstanceRecovery>
            <Suspense fallback={<AuthBootShell />}>
              <AppCore />
            </Suspense>
          </ReactInstanceRecovery>
        </StartupWatchdogGate>
      </div>
    </div>
  );
}

export default App;
