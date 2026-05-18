import { useEffect, useState } from "react";
import {
  getBootDiagnostics,
  subscribeBootDiagnostics,
  syncBootRoute,
} from "@/lib/boot-store";
import { SHOW_BOOT_HUD } from "@/lib/is-dev";

function EagerBootHudDev() {
  const [diag, setDiag] = useState(getBootDiagnostics);

  useEffect(() => {
    syncBootRoute(
      `${window.location.pathname}${window.location.search}`,
    );
    return subscribeBootDiagnostics(() => setDiag(getBootDiagnostics()));
  }, []);

  return (
    <div
      id="amynest-eager-boot-hud"
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100000,
        padding: "6px 10px",
        fontFamily: "ui-monospace, Menlo, monospace",
        fontSize: "10px",
        lineHeight: 1.4,
        color: "#e8e0ff",
        background: "rgba(8, 4, 20, 0.94)",
        borderBottom: "1px solid rgba(168,85,247,0.5)",
        pointerEvents: "none",
      }}
    >
      <strong style={{ color: "#f9a8d4" }}>AmyNest boot</strong> · host:{" "}
      {diag.hostname} · route: {diag.route} · firebase: {diag.firebaseStatus} ·
      auth: {diag.authStatus}
      {diag.lastError ? ` · err: ${diag.lastError}` : ""}
    </div>
  );
}

/** Dev-only eager-bundle boot HUD (stripped from production bundles). */
export function EagerBootHud() {
  return SHOW_BOOT_HUD ? <EagerBootHudDev /> : null;
}
