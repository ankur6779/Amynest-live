import { lazy } from "react";
import { trackStartupEvent } from "@/lib/startup-orchestrator";
import { safeImportModule } from "@/lib/safe-import";
import { isLowMemoryIosClient } from "@/lib/device-lite";
import { trackStartupFunnel, trackStartupFunnelFailure } from "@/lib/startup-funnel";
import {
  diagnosticsToTelemetry,
  logStartupDiagnostics,
} from "@/lib/startup-diagnostics";

/** Brief pause after lite splash so iOS can reclaim splash GPU layers before AppCore parse. */
const IOS_LOW_MEMORY_BOOT_DELAY_MS = 350;
/** Production bound only — Vite cold transform often exceeds 20s in local/dev. */
const APPCORE_IMPORT_TIMEOUT_MS = 20_000;

function loadAppCore() {
  const load = () => safeImportModule(() => import("./AppCore"), "./AppCore");
  // Local/dev: never delay AppCore — cold Vite transforms already take time.
  if (import.meta.env.DEV || !isLowMemoryIosClient()) return load();
  return new Promise<Awaited<ReturnType<typeof load>>>((resolve, reject) => {
    window.setTimeout(() => {
      void load().then(resolve, reject);
    }, IOS_LOW_MEMORY_BOOT_DELAY_MS);
  });
}

function loadAppCoreWithTimeout() {
  // Dev/local: no crash timeout. Wait for Vite to finish transforming AppCore.
  if (import.meta.env.DEV) {
    const slowWarn = window.setTimeout(() => {
      const diag = logStartupDiagnostics("appcore_import_slow_dev");
      console.warn(
        "[amynest:dev] AppCore still loading — Vite cold transform in progress (no crash).",
        diag,
      );
    }, 20_000);
    return loadAppCore().finally(() => {
      window.clearTimeout(slowWarn);
    });
  }

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
      trackStartupFunnel("startup_timeout", {
        meta: { stage: "appcore_import" },
      });
      trackStartupFunnelFailure(
        "chunk_load_failed",
        new Error("AppCore chunk import timeout"),
        { meta: { stage: "appcore_import" } },
      );
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
        trackStartupFunnelFailure("chunk_load_failed", err, { meta: { stage: "appcore_import" } });
        reject(err);
      },
    );
  });
}

const AppCore = lazy(() => loadAppCoreWithTimeout());

export default function AppCoreLoader() {
  return <AppCore />;
}
