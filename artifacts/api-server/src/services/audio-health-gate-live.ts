/**
 * Live audio health gate — delegates to unified runner (same path as CI).
 */
import { resolveApiPublicUrl } from "../lib/env.js";
import { loadStaticAudioMapFromRepo } from "./audio-health-gate-static.js";
import type { AudioHealthGateReport } from "./audio-health-gate.js";
import { runAudioHealthGate } from "./audio-health-gate-runner.js";

function resolveGateApiUrl(): string {
  return (
    resolveApiPublicUrl() ??
    process.env.AUDIO_GATE_API_URL ??
    process.env.SMOKE_API_URL ??
    process.env.API_PUBLIC_URL ??
    "https://www.amynest.in"
  ).replace(/\/$/, "");
}

function resolveAdminToken(): string {
  return (
    process.env.ADMIN_AUTH_TOKEN ??
    process.env.COACH_STRESS_AUTH_TOKEN ??
    process.env.STABILITY_AUTH_TOKEN ??
    ""
  ).trim();
}

/** Build gate report using the same runner as CI (HTTP probes against public API URL). */
export async function runLiveAudioHealthGate(): Promise<AudioHealthGateReport> {
  const staticSampleHashes = loadStaticAudioMapFromRepo(10);
  return runAudioHealthGate({
    apiUrl: resolveGateApiUrl(),
    adminToken: resolveAdminToken(),
    internalHealthSecret: process.env.INTERNAL_HEALTH_SECRET?.trim() ?? "",
    requireProductionSecrets: false,
    staticSampleHashes,
  });
}
