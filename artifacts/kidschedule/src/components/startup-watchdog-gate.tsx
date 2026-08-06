import { useEffect, useRef, useState, type ReactNode } from "react";
import { handleRecoveryReload } from "@/lib/clear-cache-reload";
import {
  resetAutoRecoveryCounters,
} from "@/lib/auto-recovery";
import { clearRefreshCompleteFlag } from "@/lib/refresh-orchestrator";
import { trackStartupEvent } from "@/lib/startup-orchestrator";
import { trackStartupFunnel } from "@/lib/startup-funnel";
import {
  collectStartupDiagnostics,
  diagnosticsToTelemetry,
} from "@/lib/startup-diagnostics";

import { isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";

/**
 * Global startup watchdog.
 *
 * THE bug this closes: once `markReactRendered()` runs (synchronously right
 * after `createRoot().render()` in main.tsx), the HTML boot watchdog treats
 * boot as "ok" and disarms itself forever. From that point nothing guarantees
 * the user reaches a usable UI — if the lazy `AppCore` chunk fetch *hangs*
 * (never resolves nor rejects, common on OEM Android WebViews with flaky
 * networks / captive portals / IPv6-only / aggressive battery throttling) the
 * Suspense fallback ("Loading AmyNest…") stays on screen indefinitely.
 *
 * This gate runs in the eager bundle (so it works even when AppCore never
 * loads) and arms a hard 10s deadline keyed on `__amynestAppCoreReady`. If the
 * app has not become usable by then, it surfaces an actionable recovery UI
 * (Retry + Continue) on top of the loading shell. Infinite loading becomes
 * impossible: the user always gets a way forward within 10 seconds.
 */

// Production mobile needs a short recovery path. Local Vite cold transforms
// often take >10–20s on first AppCore import — never trip the watchdog in DEV.
const WATCHDOG_DEADLINE_MS = import.meta.env.DEV
  ? 180_000
  : isNativeAmyNestAndroidWrapper()
    ? 18_000
    : 10_000;
const READY_POLL_MS = 250;

function appCoreReady(): boolean {
  if (typeof window === "undefined") return false;
  return (window as Window & { __amynestAppCoreReady?: boolean })
    .__amynestAppCoreReady === true;
}

/** Force-remove the index.html splash so the recovery UI is not hidden under it. */
function forceDismissHtmlSplash(): void {
  if (typeof document === "undefined") return;
  try {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("splash-hide");
      window.setTimeout(() => splash.remove(), 200);
    }
  } catch {
    /* ignore */
  }
}

export function StartupWatchdogGate({ children }: { children: ReactNode }) {
  const [tripped, setTripped] = useState(false);
  const [continued, setContinued] = useState(false);
  const [reloading, setReloading] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (appCoreReady()) return;

    let pollId: ReturnType<typeof setInterval> | null = null;

    const disarm = () => {
      if (pollId !== null) {
        clearInterval(pollId);
        pollId = null;
      }
    };

    const deadlineId = window.setTimeout(() => {
      if (firedRef.current || appCoreReady()) return;
      firedRef.current = true;
      disarm();

      const diag = collectStartupDiagnostics();
      try {
        console.error(
          "[amynest:startup-watchdog] App not usable within 10s — showing recovery UI",
          diagnosticsToTelemetry(diag),
        );
      } catch {
        /* ignore */
      }
      trackStartupEvent("boot_timeout", {
        source: "startup_watchdog_gate",
        ...diagnosticsToTelemetry(diag),
      });
      trackStartupFunnel("startup_timeout", {
        meta: { source: "startup_watchdog_gate" },
      });
      trackStartupFunnel("blank_screen_detected", {
        meta: { source: "startup_watchdog_gate" },
      });

      forceDismissHtmlSplash();
      setTripped(true);
    }, WATCHDOG_DEADLINE_MS);

    // Poll for readiness so we can disarm the moment AppCore mounts (covers
    // the common case where AppCore loads at ~8–9s on a genuinely slow link).
    pollId = setInterval(() => {
      if (appCoreReady()) {
        firedRef.current = true;
        disarm();
        window.clearTimeout(deadlineId);
        setTripped(false);
      }
    }, READY_POLL_MS);

    return () => {
      disarm();
      window.clearTimeout(deadlineId);
    };
  }, []);

  // If the app became usable while the recovery UI was showing, dismiss it.
  useEffect(() => {
    if (!tripped || continued) return;
    const id = setInterval(() => {
      if (appCoreReady()) {
        setTripped(false);
      }
    }, READY_POLL_MS);
    return () => clearInterval(id);
  }, [tripped, continued]);

  const showRecovery = tripped && !continued;

  return (
    <>
      {children}
      {showRecovery && (
        <StartupRecoveryOverlay
          reloading={reloading}
          onRetry={() => {
            setReloading(true);
            void (async () => {
              resetAutoRecoveryCounters();
              clearRefreshCompleteFlag();
              trackStartupEvent("startup_recovery_used", {
                source: "startup_watchdog_gate",
                action: "retry",
              });
              const outcome = await handleRecoveryReload({
                reason: "startup_watchdog",
                force: true,
                onTimeout: () => {
                  console.error("[Refresh] Timeout");
                  setReloading(false);
                },
              });
              if (outcome !== "scheduled" && outcome !== "skipped_in_flight") {
                setReloading(false);
              }
            })();
          }}
          onContinue={() => {
            trackStartupEvent("startup_recovery_used", {
              source: "startup_watchdog_gate",
              action: "continue",
            });
            setContinued(true);
          }}
        />
      )}
    </>
  );
}

function StartupRecoveryOverlay({
  reloading,
  onRetry,
  onContinue,
}: {
  reloading: boolean;
  onRetry: () => void;
  onContinue: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-label="Connection issue detected"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background:
          "linear-gradient(175deg, #0a061a 0%, #120a2e 55%, #050010 100%)",
        color: "#f0e8ff",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 700 }}>
          {reloading ? "Reloading AmyNest…" : "Connection issue detected"}
        </h1>
        <p
          style={{
            margin: "0 0 24px",
            fontSize: 15,
            lineHeight: 1.55,
            opacity: 0.85,
          }}
        >
          {reloading
            ? "Clearing cache and reloading…"
            : "AmyNest is taking longer than usual to start. This is usually a slow or unstable network. You can retry, or continue and we'll keep loading in the background."}
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "stretch",
          }}
        >
          <button
            type="button"
            disabled={reloading}
            onClick={onRetry}
            style={{
              padding: "14px 28px",
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(90deg, #7c3aed, #ec4899)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              cursor: reloading ? "wait" : "pointer",
            }}
          >
            {reloading ? "Reloading…" : "Retry"}
          </button>
          <button
            type="button"
            disabled={reloading}
            onClick={onContinue}
            style={{
              padding: "12px 28px",
              borderRadius: 999,
              border: "1px solid rgba(168,85,247,0.4)",
              background: "transparent",
              color: "#e9d5ff",
              fontSize: 15,
              fontWeight: 600,
              cursor: reloading ? "wait" : "pointer",
            }}
          >
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  );
}
