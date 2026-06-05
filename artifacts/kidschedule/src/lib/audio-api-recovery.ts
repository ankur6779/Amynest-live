/**
 * Recovers client audio circuits after backend deploy / cold start.
 * Polls /api/healthz/audio and clears breakers when the API is healthy again.
 */

import { resetTtsApiCircuit } from "@/lib/amy-voice-circuit";
import { getApiUrl } from "@/lib/api";
import { resetClientStaticAudioCircuit } from "@/lib/static-audio-telemetry";

const RECOVERY_POLL_MS = 12_000;
const BOOT_PROBE_INTERVAL_MS = 2_000;
const BOOT_PROBE_MAX_ATTEMPTS = 10;
const BOOT_PROBE_TIMEOUT_MS = 10_000;

let watcherStarted = false;
let lastKnownApiOk = true;

function resetAudioCircuits(reason: string): void {
  resetClientStaticAudioCircuit();
  resetTtsApiCircuit();
  console.info("[AUDIO] Circuits reset —", reason);
}

/** Call when a fetch to the API fails with a deploy-style error. */
export function markAudioApiUnreachable(): void {
  lastKnownApiOk = false;
}

async function probeAudioHealth(): Promise<boolean> {
  try {
    const url = getApiUrl("/api/healthz/audio");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), BOOT_PROBE_TIMEOUT_MS);
    const res = await fetch(url, {
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    }).finally(() => window.clearTimeout(timer));
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return res.ok && body.ok === true;
  } catch {
    return false;
  }
}

/** Retry health during boot while Render is swapping instances. */
export async function waitForAudioApiOnBoot(): Promise<boolean> {
  for (let attempt = 0; attempt < BOOT_PROBE_MAX_ATTEMPTS; attempt += 1) {
    if (await probeAudioHealth()) {
      lastKnownApiOk = true;
      return true;
    }
    if (attempt < BOOT_PROBE_MAX_ATTEMPTS - 1) {
      await new Promise((r) => setTimeout(r, BOOT_PROBE_INTERVAL_MS));
    }
  }
  lastKnownApiOk = false;
  return false;
}

/** Long-lived poll — clears breakers after deploy without requiring page refresh. */
export function startAudioApiRecoveryWatcher(): void {
  if (watcherStarted || typeof window === "undefined") return;
  watcherStarted = true;

  setInterval(() => {
    void (async () => {
      const ok = await probeAudioHealth();
      if (ok) {
        if (!lastKnownApiOk) {
          resetAudioCircuits("API recovered after deploy");
        }
        lastKnownApiOk = true;
        return;
      }
      lastKnownApiOk = false;
    })();
  }, RECOVERY_POLL_MS);
}
