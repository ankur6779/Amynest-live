/**
 * Hardened health probes — retries, composite health, persistence.
 */
import { appendFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { apiUrl } from "./probes";
import { auditDir } from "./repo-root";

export const RETRY_BACKOFF_MS = [250, 500, 1000] as const;
export const GAP_INVALIDATE_MS = 120_000;
export const CONSECUTIVE_FAILURES_FOR_DEGRADATION = 3;

export type ProbeResult = {
  ok: boolean;
  status: number;
  latencyMs: number;
  error?: string;
  body?: unknown;
};

export type EndpointProbeResult = {
  endpoint: string;
  url: string;
  ok: boolean;
  status: number;
  latencyMs: number;
  error?: string;
  retry_count: number;
  tls_verify_ok: boolean | null;
  attempts: number;
};

export type PersistedProbeRecord = {
  timestamp: string;
  cycle_id: string;
  backend: "render" | "coolify";
  host: string;
  endpoint: string;
  url: string;
  status: number;
  latency_ms: number;
  error?: string;
  retry_count: number;
  tls_verify_ok: boolean | null;
  ok: boolean;
};

export type CompositeHealthResult = {
  timestamp: string;
  cycle_id: string;
  backend: "render" | "coolify";
  host: string;
  base_url: string;
  healthy: boolean;
  endpoints: {
    health: EndpointProbeResult;
    healthz: EndpointProbeResult;
    healthzEnv: EndpointProbeResult;
  };
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function tlsOk(url: string, err?: string): boolean | null {
  if (!url.startsWith("https://")) return null;
  if (!err) return true;
  const e = err.toLowerCase();
  if (
    e.includes("cert") ||
    e.includes("tls") ||
    e.includes("ssl") ||
    e.includes("unable to verify")
  ) {
    return false;
  }
  return null;
}

async function fetchOnce(
  url: string,
  headers?: Record<string, string>,
): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      /* text */
    }
    return {
      ok: res.ok,
      status: res.status,
      latencyMs: Date.now() - start,
      body,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - start,
      error: message,
    };
  }
}

export async function probeEndpointWithRetries(
  url: string,
  endpoint: string,
  headers?: Record<string, string>,
): Promise<EndpointProbeResult> {
  let last: ProbeResult = { ok: false, status: 0, latencyMs: 0, error: "no attempt" };
  let retry_count = 0;

  for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt++) {
    last = await fetchOnce(url, headers);
    if (last.ok) {
      return {
        endpoint,
        url,
        ok: true,
        status: last.status,
        latencyMs: last.latencyMs,
        retry_count,
        tls_verify_ok: tlsOk(url, last.error),
        attempts: attempt + 1,
      };
    }
    if (attempt < RETRY_BACKOFF_MS.length) {
      retry_count += 1;
      await sleep(RETRY_BACKOFF_MS[attempt]!);
    }
  }

  return {
    endpoint,
    url,
    ok: false,
    status: last.status,
    latencyMs: last.latencyMs,
    error: last.error,
    retry_count,
    tls_verify_ok: tlsOk(url, last.error),
    attempts: RETRY_BACKOFF_MS.length + 1,
  };
}

export function isApplicationUnhealthy(endpoints: CompositeHealthResult["endpoints"]): boolean {
  return !endpoints.health.ok && !endpoints.healthz.ok && !endpoints.healthzEnv.ok;
}

export async function probeCompositeHealth(
  backend: "render" | "coolify",
  baseUrl: string,
  cycleId: string,
  healthSecret?: string,
): Promise<CompositeHealthResult> {
  const host = os.hostname();
  const headers = healthSecret ? { "x-health-secret": healthSecret } : undefined;

  const health = await probeEndpointWithRetries(apiUrl(baseUrl, "/health"), "/health");
  const healthz = await probeEndpointWithRetries(apiUrl(baseUrl, "/healthz"), "/api/healthz");
  const healthzEnv = await probeEndpointWithRetries(
    apiUrl(baseUrl, "/healthz/env"),
    "/api/healthz/env",
    headers,
  );

  const endpoints = { health, healthz, healthzEnv };
  const healthy = !isApplicationUnhealthy(endpoints);

  return {
    timestamp: new Date().toISOString(),
    cycle_id: cycleId,
    backend,
    host,
    base_url: baseUrl,
    healthy,
    endpoints,
  };
}

export async function persistProbeRecords(
  composite: CompositeHealthResult,
  logPath?: string,
): Promise<void> {
  const file =
    logPath ?? path.join(auditDir(), "probe-log.jsonl");
  await mkdir(path.dirname(file), { recursive: true });

  const lines: PersistedProbeRecord[] = (
    Object.values(composite.endpoints) as EndpointProbeResult[]
  ).map((ep) => ({
    timestamp: composite.timestamp,
    cycle_id: composite.cycle_id,
    backend: composite.backend,
    host: composite.host,
    endpoint: ep.endpoint,
    url: ep.url,
    status: ep.status,
    latency_ms: ep.latencyMs,
    error: ep.error,
    retry_count: ep.retry_count,
    tls_verify_ok: ep.tls_verify_ok,
    ok: ep.ok,
  }));

  for (const rec of lines) {
    await appendFile(file, `${JSON.stringify(rec)}\n`, "utf8");
  }
}
