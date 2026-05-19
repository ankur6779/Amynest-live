import { useEffect, useState } from "react";

type CrashInfo = {
  message: string;
  source?: string;
  line?: number;
  col?: number;
  stack?: string;
};

export default function DebugOverlay() {
  const [error, setError] = useState<CrashInfo | null>(null);

  useEffect(() => {
    window.onerror = (msg, src, line, col, err) => {
      setError({
        message: String(msg),
        source: src,
        line,
        col,
        stack: err?.stack,
      });
    };

    window.onunhandledrejection = (e) => {
      const reason = e.reason;
      setError({
        message:
          reason instanceof Error
            ? reason.message
            : reason?.message || "Unhandled promise rejection",
        stack: reason instanceof Error ? reason.stack : reason?.stack,
      });
    };
  }, []);

  if (!error) return null;

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
      }}
    >
      <h2>🔥 APP CRASH DETECTED</h2>
      <pre>{JSON.stringify(error, null, 2)}</pre>
    </div>
  );
}
