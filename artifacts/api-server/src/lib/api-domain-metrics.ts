/**
 * Process-local API domain metrics for Phase 3 observability (P0/P2 scope).
 * Surfaces success rate, failure rate, and latency for production-critical domains.
 */

export type ApiDomain =
  | "auth"
  | "analytics"
  | "routines"
  | "billing"
  | "learning_progress"
  | "hub_journey"
  | "device_registration";

type DomainCounter = {
  success: number;
  failure: number;
  totalDurationMs: number;
  lastErrorCode: string | null;
  lastErrorAt: string | null;
};

const counters = new Map<ApiDomain, DomainCounter>();

function emptyCounter(): DomainCounter {
  return {
    success: 0,
    failure: 0,
    totalDurationMs: 0,
    lastErrorCode: null,
    lastErrorAt: null,
  };
}

function counterFor(domain: ApiDomain): DomainCounter {
  let c = counters.get(domain);
  if (!c) {
    c = emptyCounter();
    counters.set(domain, c);
  }
  return c;
}

export function recordApiDomainOutcome(
  domain: ApiDomain,
  ok: boolean,
  durationMs: number,
  errorCode?: string,
): void {
  const c = counterFor(domain);
  if (ok) {
    c.success += 1;
  } else {
    c.failure += 1;
    if (errorCode) {
      c.lastErrorCode = errorCode.slice(0, 128);
      c.lastErrorAt = new Date().toISOString();
    }
  }
  c.totalDurationMs += Math.max(0, durationMs);
}

export async function withApiDomainMetrics<T>(
  domain: ApiDomain,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    recordApiDomainOutcome(domain, true, Date.now() - start);
    return result;
  } catch (err) {
    const code = err instanceof Error ? err.message : "error";
    recordApiDomainOutcome(domain, false, Date.now() - start, code);
    throw err;
  }
}

export type ApiDomainMetricsSnapshot = {
  since: string;
  domains: Record<
    ApiDomain,
    {
      success: number;
      failure: number;
      total: number;
      successRate: number;
      avgDurationMs: number;
      lastErrorCode: string | null;
      lastErrorAt: string | null;
    }
  >;
};

const METRICS_SINCE = Date.now();

export function getApiDomainMetrics(): ApiDomainMetricsSnapshot {
  const domains = {} as ApiDomainMetricsSnapshot["domains"];
  const allDomains: ApiDomain[] = [
    "auth",
    "analytics",
    "routines",
    "billing",
    "learning_progress",
    "hub_journey",
    "device_registration",
  ];

  for (const domain of allDomains) {
    const c = counters.get(domain) ?? emptyCounter();
    const total = c.success + c.failure;
    domains[domain] = {
      success: c.success,
      failure: c.failure,
      total,
      successRate: total === 0 ? 1 : Math.round((c.success / total) * 1000) / 1000,
      avgDurationMs: total === 0 ? 0 : Math.round(c.totalDurationMs / total),
      lastErrorCode: c.lastErrorCode,
      lastErrorAt: c.lastErrorAt,
    };
  }

  return { since: new Date(METRICS_SINCE).toISOString(), domains };
}

/** Test helper */
export function resetApiDomainMetrics(): void {
  counters.clear();
}
