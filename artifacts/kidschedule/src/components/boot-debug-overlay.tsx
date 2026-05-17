import { useEffect, useState } from "react";
import {
  getBootDiagnostics,
  subscribeBootDiagnostics,
  syncBootRoute,
} from "@/lib/boot-store";

function currentPathname(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

/** Visible production debug panel — fixed on top, before route matching. */
export function BootDebugOverlay() {
  const [route, setRoute] = useState(currentPathname);
  const [diag, setDiag] = useState(getBootDiagnostics);

  useEffect(() => {
    const syncRoute = () => {
      const path = currentPathname();
      setRoute(path);
      syncBootRoute(path);
    };
    syncRoute();
    window.addEventListener("popstate", syncRoute);
    const unsubDiag = subscribeBootDiagnostics(() => {
      const next = getBootDiagnostics();
      setDiag(next);
      if (next.route) setRoute(next.route);
    });
    return () => {
      window.removeEventListener("popstate", syncRoute);
      unsubDiag();
    };
  }, []);

  return (
    <div
      id="amynest-boot-debug"
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        maxHeight: "42vh",
        overflow: "auto",
        padding: "8px 10px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "10px",
        lineHeight: 1.45,
        color: "#e8e0ff",
        background: "rgba(8, 4, 20, 0.92)",
        borderBottom: "1px solid rgba(168,85,247,0.45)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        pointerEvents: "none",
      }}
    >
      <strong style={{ color: "#f9a8d4" }}>AmyNest boot</strong>
      <div>host: {diag.hostname}</div>
      <div>route: {route || diag.route}</div>
      <div>
        firebase:{" "}
        <span
          style={{
            color:
              diag.firebaseStatus === "ok"
                ? "#86efac"
                : diag.firebaseStatus === "fail"
                  ? "#fca5a5"
                  : "#fde68a",
          }}
        >
          {diag.firebaseStatus}
        </span>
        {diag.firebaseError ? ` (${diag.firebaseError})` : ""}
      </div>
      <div>
        auth:{" "}
        <span
          style={{
            color:
              diag.authStatus === "authenticated"
                ? "#86efac"
                : diag.authStatus === "timeout"
                  ? "#fca5a5"
                  : diag.authStatus === "unauthenticated"
                    ? "#93c5fd"
                    : "#fde68a",
          }}
        >
          {diag.authStatus}
        </span>{" "}
        · {diag.authUserLabel}
      </div>
      <div>build: {diag.appVersion}</div>
      {diag.lastError ? (
        <div style={{ color: "#fca5a5", marginTop: 4 }}>err: {diag.lastError}</div>
      ) : null}
    </div>
  );
}
