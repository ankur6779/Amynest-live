import { useEffect, useState } from "react";
import { getBootDiagnostics } from "@/lib/boot-store";
import { getCrashLog, type CrashLogEntry } from "@/lib/crash-logger";

type CrashInfo = {
  kind: "window.onerror" | "unhandledrejection" | "window.error";
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

export default function DebugOverlay() {
  const [payload, setPayload] = useState<OverlayPayload | null>(null);

  useEffect(() => {
    const show = (kind: CrashInfo["kind"], crash: Omit<CrashInfo, "kind" | "at">) => {
      setPayload(buildPayload(kind, crash));
    };

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

    // Chain — do not overwrite handlers installed in main.tsx / crash-logger.
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

  if (!payload) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "#000",
        color: "#0f0",
        zIndex: 999999,
        padding: 20,
        overflow: "auto",
        fontSize: 12,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    >
      <h2 style={{ margin: "0 0 12px", color: "#f55" }}>🔥 APP CRASH DETECTED</h2>
      <p style={{ color: "#9f9", margin: "0 0 8px" }}>
        Read <strong>crash.message</strong> + <strong>crash.stack</strong> first. If you see
        &quot;React Crash&quot; instead, it is a render error (check component stack in that overlay).
      </p>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {JSON.stringify(payload, null, 2)}
      </pre>
    </div>
  );
}
