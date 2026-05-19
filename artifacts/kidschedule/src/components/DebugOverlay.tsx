import { useEffect, useState } from "react";
import { getBootDiagnostics } from "@/lib/boot-store";
import { getCrashLog, type CrashLogEntry } from "@/lib/crash-logger";
import {
  showProductionCrashOverlay,
  type ProductionCrashPayload,
} from "@/lib/production-crash-overlay";

type CrashInfo = {
  kind: ProductionCrashPayload["kind"];
  message: string;
  source?: string;
  line?: number;
  col?: number;
  stack?: string;
  at: string;
};

type RecentError = {
  ts: number;
  source: string;
  message: string;
  detail?: string;
};

type OverlayPayload = {
  crash: CrashInfo;
  route: string;
  href: string;
  boot: ReturnType<typeof getBootDiagnostics>;
  recentErrors: RecentError[];
  crashLog: CrashLogEntry[];
};

function readRecentErrors(): RecentError[] {
  try {
    const w = window as Window & { __amynestRecentErrors?: RecentError[] };
    return w.__amynestRecentErrors ? [...w.__amynestRecentErrors] : [];
  } catch {
    return [];
  }
}

function buildPayload(kind: CrashInfo["kind"], crash: Omit<CrashInfo, "kind" | "at">): OverlayPayload {
  return {
    crash: { ...crash, kind, at: new Date().toISOString() },
    route: window.location.pathname,
    href: window.location.href,
    boot: getBootDiagnostics(),
    recentErrors: readRecentErrors(),
    crashLog: [...getCrashLog()].slice(-10),
  };
}

/** React mirror of the pre-React DOM crash overlay (kept for tests / devtools). */
export default function DebugOverlay() {
  const [payload, setPayload] = useState<OverlayPayload | null>(null);

  useEffect(() => {
    const show = (kind: CrashInfo["kind"], crash: Omit<CrashInfo, "kind" | "at">) => {
      const full = buildPayload(kind, crash);
      setPayload(full);
      showProductionCrashOverlay(full);
    };

    const w = window as Window & { __amynestLastCrash?: unknown };
    if (w.__amynestLastCrash) {
      showProductionCrashOverlay(w.__amynestLastCrash);
    }

    const onWindowError = (
      msg: string | Event,
      src?: string,
      line?: number,
      col?: number,
      err?: Error,
    ) => {
      show("window.onerror", {
        message: String(msg),
        source: src,
        line,
        col,
        stack: err?.stack,
      });
    };

    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      show("unhandledrejection", {
        message:
          reason instanceof Error
            ? reason.message
            : reason?.message || "Unhandled promise rejection",
        stack: reason instanceof Error ? reason.stack : reason?.stack,
      });
    };

    const onErrorEvent = (event: ErrorEvent) => {
      show("window.error", {
        message: event.message || "Script error",
        source: event.filename,
        line: event.lineno,
        col: event.colno,
        stack: event.error instanceof Error ? event.error.stack : undefined,
      });
    };

    const prevOnError = window.onerror;
    window.onerror = (msg, src, line, col, err) => {
      onWindowError(msg, src, line, col, err);
      if (typeof prevOnError === "function") {
        return prevOnError.call(window, msg, src, line, col, err);
      }
      return false;
    };

    const prevRejection = window.onunhandledrejection;
    window.onunhandledrejection = (e) => {
      onUnhandledRejection(e);
      if (typeof prevRejection === "function") {
        prevRejection.call(window, e);
      }
    };

    window.addEventListener("error", onErrorEvent);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.onerror = prevOnError;
      window.onunhandledrejection = prevRejection;
      window.removeEventListener("error", onErrorEvent);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  // DOM overlay (#amynest-crash-overlay) is the visible production UI.
  if (!payload) return null;

  return null;
}
