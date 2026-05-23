/**
 * Server-side TTS API health — rolling 15-minute window.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_SAMPLES = 5_000;

type ApiRoute = "generate" | "stream" | "synthesize";

type ApiSample = {
  route: ApiRoute;
  success: boolean;
  latencyMs: number;
  at: number;
  errorType?: string;
};

const samples: ApiSample[] = [];

function prune(now = Date.now()): void {
  const cutoff = now - WINDOW_MS;
  while (samples.length > 0 && samples[0]!.at < cutoff) {
    samples.shift();
  }
  if (samples.length > MAX_SAMPLES) {
    samples.splice(0, samples.length - MAX_SAMPLES);
  }
}

export function recordApiHealthSample(params: {
  route: ApiRoute;
  success: boolean;
  latencyMs: number;
  errorType?: string;
}): void {
  const now = Date.now();
  samples.push({
    route: params.route,
    success: params.success,
    latencyMs: Math.max(0, Math.min(params.latencyMs, 120_000)),
    at: now,
    errorType: params.errorType?.slice(0, 120),
  });
  prune(now);
}

export type ApiRouteStats = {
  route: string;
  label: string;
  total: number;
  successRate: number;
  avgLatencyMs: number;
  errorRate: number;
  alert: boolean;
};

export type ApiHealthSnapshot = {
  routes: ApiRouteStats[];
};

const ROUTE_LABELS: Record<ApiRoute, string> = {
  generate: "/tts/generate",
  stream: "/tts/stream",
  synthesize: "/tts/synthesize",
};

export function getApiHealthSnapshot(now = Date.now()): ApiHealthSnapshot {
  prune(now);
  const cutoff = now - WINDOW_MS;
  const windowSamples = samples.filter((s) => s.at >= cutoff);

  const routes: ApiRouteStats[] = (["generate", "stream", "synthesize"] as ApiRoute[]).map(
    (route) => {
      const rows = windowSamples.filter((s) => s.route === route);
      const total = rows.length;
      const successes = rows.filter((s) => s.success).length;
      const successRate = total > 0 ? successes / total : 1;
      const errorRate = total > 0 ? 1 - successRate : 0;
      const avgLatencyMs =
        rows.length > 0
          ? rows.reduce((sum, r) => sum + r.latencyMs, 0) / rows.length
          : 0;
      const alert = errorRate > 0.05 || avgLatencyMs > 1500;
      return {
        route,
        label: ROUTE_LABELS[route],
        total,
        successRate,
        avgLatencyMs,
        errorRate,
        alert,
      };
    },
  );

  return { routes };
}

/** Test-only reset. */
export function resetApiHealthStoreForTests(): void {
  samples.length = 0;
}
