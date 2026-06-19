import { lazy } from "react";
import { trackStartupEvent } from "@/lib/startup-orchestrator";
import { safeImportModule } from "@/lib/safe-import";
import { isLowMemoryIosClient } from "@/lib/device-lite";
import {
  diagnosticsToTelemetry,
  logStartupDiagnostics,
} from "@/lib/startup-diagnostics";

/** Brief pause after lite splash so iOS can reclaim splash GPU layers before AppCore parse. */
const IOS_LOW_MEMORY_BOOT_DELAY_MS = 350;
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

const AppCore = lazy(() => loadAppCoreWithTimeout());

export default function AppCoreLoader() {
  return <AppCore />;
}
