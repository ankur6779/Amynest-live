import { lazy, Suspense, useEffect, useState } from "react";
import { markAppShellReady } from "@/lib/startup-orchestrator";
import { devLog } from "@/lib/dev-log";
import { initNativeShell } from "@/lib/native-shell";
import { AuthBootShell } from "@/components/auth-boot-shell";
import DebugOverlay from "@/components/DebugOverlay";
import { ReactInstanceRecovery } from "@/components/react-instance-recovery";
import { StartupWatchdogGate } from "@/components/startup-watchdog-gate";

// Everything heavy — Firebase Auth, providers, the router, every page route,
// and the Layout shell — lives in AppCore. The shell starts the AppCore import
// only after the first browser paint so AppCore parsing cannot block first UI.
const AppCoreLoader = lazy(() => import("./AppCoreLoader"));

declare global {
  interface Window {
    __amynestMark?: (phase: string) => void;
  }
}

function App() {
  const [shouldLoadAppCore, setShouldLoadAppCore] = useState(false);

  useEffect(() => {
    devLog("APP MOUNTED");
    markAppShellReady();
    initNativeShell();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let secondFrame: number | null = null;
    const id = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (!cancelled) setShouldLoadAppCore(true);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
      if (secondFrame !== null) {
        window.cancelAnimationFrame(secondFrame);
      }
    };
  }, []);

  return (
    <div id="app-root" className="app-root w-full max-w-full min-w-0">
      <div className="app-scroll page-content">
        <DebugOverlay />
        <StartupWatchdogGate>
          <ReactInstanceRecovery>
            <Suspense fallback={<AuthBootShell />}>
              {shouldLoadAppCore ? <AppCoreLoader /> : <AuthBootShell />}
            </Suspense>
          </ReactInstanceRecovery>
        </StartupWatchdogGate>
      </div>
    </div>
  );
}

export default App;
