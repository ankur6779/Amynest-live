/**
 * PythonEphemerisAdapter — Node EphemerisPort → localhost ephemeris daemon.
 *
 * Engine-agnostic remote adapter. The daemon owns the concrete EnginePort
 * implementation and returns opaque engineVersion strings.
 */

import { createHash } from "node:crypto";
import type {
  AstronomyData,
  EphemerisComputeInput,
  EphemerisComputeResult,
  EphemerisPort,
} from "./ephemeris-port.js";
import {
  EphemerisComputeError,
  EphemerisUnavailableError,
} from "./ephemeris-port.js";

/** Opaque adapter label for logs — not an astronomy engine id. */
export const PYTHON_EPHEMERIS_ADAPTER_ID = "python-ephemeris-adapter";

function baseUrl(): string {
  return (
    process.env.BIRTH_SKY_EPHEMERIS_URL?.trim() || "http://127.0.0.1:5099"
  ).replace(/\/$/, "");
}

function authHeaders(): Record<string, string> {
  const token = process.env.BIRTH_SKY_EPHEMERIS_TOKEN?.trim();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export type EphemerisDaemonHealth = {
  ok: boolean;
  ready?: boolean;
  engine?: string;
  engineVersion?: string;
  kernel?: string;
  kernelFingerprint?: string;
  loaded?: boolean;
  uptimeSeconds?: number;
  chartsComputed?: number;
  averageLatencyMs?: number;
  memoryMB?: number;
  error?: string;
};

let cachedEngineVersion = "remote/pending";

export async function checkEphemerisReady(): Promise<EphemerisDaemonHealth> {
  try {
    const res = await fetch(`${baseUrl()}/readyz`, {
      headers: authHeaders(),
      signal: AbortSignal.timeout(3_000),
    });
    const body = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      return {
        ok: false,
        ready: false,
        error: typeof body.message === "string" ? body.message : "not_ready",
      };
    }
    const engine =
      typeof body.engine === "string"
        ? body.engine
        : typeof body.engineName === "string"
          ? body.engineName
          : undefined;
    const versionPart =
      typeof body.engineVersion === "string" ? body.engineVersion : undefined;
    // Daemon may return full "name/version" or split fields
    const fullVersion =
      typeof body.engineVersionFull === "string"
        ? body.engineVersionFull
        : engine && versionPart && !versionPart.includes("/")
          ? `${engine}/${versionPart}`
          : versionPart;
    if (fullVersion) cachedEngineVersion = fullVersion;
    return {
      ok: true,
      ready: true,
      engine,
      engineVersion: fullVersion,
      kernel:
        typeof body.kernel === "string"
          ? body.kernel
          : typeof body.bspKernel === "string"
            ? body.bspKernel
            : undefined,
      kernelFingerprint:
        typeof body.kernelFingerprint === "string"
          ? body.kernelFingerprint
          : undefined,
      loaded: body.loaded === true || body.loaded === undefined,
      uptimeSeconds:
        typeof body.uptimeSeconds === "number" ? body.uptimeSeconds : undefined,
      chartsComputed:
        typeof body.chartsComputed === "number" ? body.chartsComputed : undefined,
      averageLatencyMs:
        typeof body.averageLatencyMs === "number"
          ? body.averageLatencyMs
          : undefined,
      memoryMB: typeof body.memoryMB === "number" ? body.memoryMB : undefined,
    };
  } catch (err) {
    return {
      ok: false,
      ready: false,
      error: err instanceof Error ? err.message : "ephemeris_unreachable",
    };
  }
}

function buildCacheKey(input: EphemerisComputeInput): string {
  const raw = [
    cachedEngineVersion,
    input.birthDate,
    input.birthTime ?? "",
    input.timePrecision,
    input.lat ?? "",
    input.lon ?? "",
    input.timezoneOffsetMinutes ?? "",
  ].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export function createPythonEphemerisAdapter(): EphemerisPort {
  return {
    get engineVersion() {
      return cachedEngineVersion;
    },
    isTemporaryAdapter: false,
    buildCacheKey,
    async compute(input: EphemerisComputeInput): Promise<EphemerisComputeResult> {
      let res: Response;
      try {
        res = await fetch(`${baseUrl()}/v1/compute`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            birthDate: input.birthDate,
            birthTime: input.birthTime,
            timePrecision: input.timePrecision,
            lat: input.lat,
            lon: input.lon,
            timezoneOffsetMinutes: input.timezoneOffsetMinutes ?? null,
          }),
          signal: AbortSignal.timeout(15_000),
        });
      } catch (err) {
        throw new EphemerisUnavailableError(
          err instanceof Error ? err.message : "ephemeris_unreachable",
        );
      }

      const body = (await res.json()) as Record<string, unknown>;
      if (!res.ok || body.ok === false) {
        const code = typeof body.error === "string" ? body.error : "compute_failed";
        const message =
          typeof body.message === "string" ? body.message : "ephemeris compute failed";
        if (res.status === 503 || code === "ephemeris_unavailable" || code === "not_ready") {
          throw new EphemerisUnavailableError(message);
        }
        throw new EphemerisComputeError(code, message);
      }

      const astronomy = body.astronomy as AstronomyData;
      const mode = body.mode === "day_sky" ? "day_sky" : "full";
      const engineVersion =
        typeof body.engineVersion === "string"
          ? body.engineVersion
          : cachedEngineVersion;
      cachedEngineVersion = engineVersion;

      if (!astronomy?.sunSign || !astronomy?.moonSign) {
        throw new EphemerisComputeError("invalid_response", "astronomy payload incomplete");
      }

      return { mode, astronomy, engineVersion };
    },
  };
}

/** @deprecated Use createPythonEphemerisAdapter */
export const createRemoteEphemerisAdapter = createPythonEphemerisAdapter;
