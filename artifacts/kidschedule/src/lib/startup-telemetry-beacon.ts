import { getApiUrl } from "@/lib/api";
import type { StartupTelemetryEvent } from "@/lib/startup-orchestrator";

export type StartupBeaconPayload = {
  event: StartupTelemetryEvent;
  phase?: string;
  app_version: string;
  previous_version?: string;
  platform: string;
  browser: string;
  route: string;
  react_rendered?: boolean;
  app_core_ready?: boolean;
  meta?: Record<string, string | number | boolean>;
};

const BEACON_PATH = "/api/startup-events";
const sentFingerprints = new Set<string>();

function fingerprint(payload: StartupBeaconPayload): string {
  const phaseKey =
    payload.phase ??
    (payload.meta && typeof payload.meta.phase === "string" ? payload.meta.phase : "");
  return `${payload.event}:${phaseKey}`;
}

/**
 * Anonymous, pre-auth startup telemetry (keepalive / sendBeacon).
 * Does not use queueClientLog — works before Firebase and AppCore.
 */
export function postStartupBeacon(payload: StartupBeaconPayload): void {
  if (typeof window === "undefined") return;

  const body: StartupBeaconPayload & { ts: number; href: string } = {
    ...payload,
    ts: Date.now(),
    href: window.location.href,
  };

  const fp = fingerprint(body as StartupBeaconPayload);
  if (sentFingerprints.has(fp) && body.event === "startup_phase_entered") return;
  sentFingerprints.add(fp);

  const url = getApiUrl(BEACON_PATH);
  const json = JSON.stringify(body);

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const ok = navigator.sendBeacon(
        url,
        new Blob([json], { type: "application/json" }),
      );
      if (ok) return;
    }
  } catch {
    /* fall through */
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: json,
    keepalive: true,
    credentials: "omit",
  }).catch(() => {
    /* best-effort */
  });
}
