/**
 * Shared HTTP probes for Render vs Coolify migration monitoring.
 */
export type ProbeResult = {
  ok: boolean;
  status: number;
  latencyMs: number;
  error?: string;
  body?: unknown;
};

export async function probeGet(url: string, headers?: Record<string, string>): Promise<ProbeResult> {
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
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function probePost(
  url: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* text */
    }
    return {
      ok: res.ok,
      status: res.status,
      latencyMs: Date.now() - start,
      body: parsed,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function apiUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p.startsWith("/api/")) return `${b}${p}`;
  if (p === "/health" || p === "/ready") return `${b}${p}`;
  return `${b}/api${p}`;
}

export type BackendSnapshot = {
  label: "render" | "coolify";
  url: string;
  health: ProbeResult;
  ready: ProbeResult;
  healthzEnv?: ProbeResult;
  subscription?: ProbeResult;
  parentProfile?: ProbeResult;
  children?: ProbeResult;
  speechCoach?: ProbeResult;
  routineGen?: ProbeResult;
  aiEnqueue?: ProbeResult;
  gcsAudio?: ProbeResult;
  rcWebhook?: ProbeResult;
  error5xxRate: number;
  latencyP95Ms: number;
  score: number;
};

export async function snapshotBackend(
  label: "render" | "coolify",
  baseUrl: string,
  opts: {
    healthSecret?: string;
    authToken?: string;
    rcSecret?: string;
    childId?: number;
    skipAi?: boolean;
  },
): Promise<BackendSnapshot> {
  const latencies: number[] = [];
  const errors5xx: number[] = [];

  const record = (r: ProbeResult) => {
    latencies.push(r.latencyMs);
    if (r.status >= 500) errors5xx.push(1);
    else if (r.status > 0) errors5xx.push(0);
  };

  const health = await probeGet(apiUrl(baseUrl, "/health"));
  record(health);

  const ready = await probeGet(apiUrl(baseUrl, "/ready"));
  record(ready);

  let healthzEnv: ProbeResult | undefined;
  if (opts.healthSecret) {
    healthzEnv = await probeGet(apiUrl(baseUrl, "/healthz/env"), {
      "x-health-secret": opts.healthSecret,
    });
    record(healthzEnv);
  }

  const gcsAudio = await probeGet(apiUrl(baseUrl, "/healthz/audio"));
  record(gcsAudio);

  const auth = opts.authToken ? { authorization: `Bearer ${opts.authToken}` } : undefined;

  let subscription: ProbeResult | undefined;
  let parentProfile: ProbeResult | undefined;
  let children: ProbeResult | undefined;
  let speechCoach: ProbeResult | undefined;
  let routineGen: ProbeResult | undefined;
  let aiEnqueue: ProbeResult | undefined;

  if (auth) {
    parentProfile = await probeGet(apiUrl(baseUrl, "/parent-profile"), auth);
    record(parentProfile);

    children = await probeGet(apiUrl(baseUrl, "/children"), auth);
    record(children);

    subscription = await probeGet(apiUrl(baseUrl, "/subscription"), auth);
    record(subscription);

    speechCoach = await probeGet(
      opts.childId
        ? apiUrl(baseUrl, `/speech/v2/usage?childId=${opts.childId}`)
        : apiUrl(baseUrl, "/remote-config/speech-coach-v2"),
      opts.childId ? auth : undefined,
    );
    record(speechCoach);

    if (opts.childId) {
      routineGen = await probePost(
        apiUrl(baseUrl, "/routines/generate-ai"),
        {
          childId: opts.childId,
          date: new Date().toISOString().slice(0, 10),
          age: 6,
          hasSchool: false,
          mood: "happy",
        },
        auth,
      );
      record(routineGen);
    }

    if (!opts.skipAi) {
      aiEnqueue = await probePost(
        apiUrl(baseUrl, "/audio-warmup/enqueue"),
        { module: "parent_hub", maxAssets: 1 },
        auth,
      );
      record(aiEnqueue);
    }
  }

  let rcWebhook: ProbeResult | undefined;
  if (opts.rcSecret) {
    rcWebhook = await probePost(
      apiUrl(baseUrl, "/subscription/webhook"),
      { event: { type: "TEST" } },
      { authorization: `Bearer ${opts.rcSecret}` },
    );
    record(rcWebhook);
  }

  const samples = errors5xx.length || 1;
  const error5xxRate = errors5xx.reduce((a, b) => a + b, 0) / samples;
  const sorted = [...latencies].sort((a, b) => a - b);
  const latencyP95Ms = sorted[Math.floor(sorted.length * 0.95)] ?? 0;

  let score = 100;
  if (!health.ok) score -= 40;
  if (error5xxRate > 0) score -= Math.min(30, error5xxRate * 100);
  if (latencyP95Ms > 3000) score -= 15;
  if (parentProfile && parentProfile.status === 401) score -= 25;
  if (subscription && subscription.status >= 500) score -= 20;
  if (aiEnqueue && aiEnqueue.status === 503) score -= 15;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    label,
    url: baseUrl,
    health,
    ready,
    healthzEnv,
    subscription,
    parentProfile,
    children,
    speechCoach,
    routineGen,
    aiEnqueue,
    gcsAudio,
    rcWebhook,
    error5xxRate,
    latencyP95Ms,
    score,
  };
}

export async function probeWorkerHealth(url: string): Promise<ProbeResult> {
  return probeGet(url);
}

export async function countDbRows(
  databaseUrl: string,
  tables: string[],
): Promise<Record<string, number>> {
  const pg = await import("pg");
  const pool = new pg.default.Pool({
    connectionString: databaseUrl,
    max: 2,
    ssl: /render\.com|sslmode=require/i.test(databaseUrl)
      ? { rejectUnauthorized: false }
      : undefined,
  });
  const client = await pool.connect();
  const out: Record<string, number> = {};
  try {
    for (const table of tables) {
      const { rows } = await client.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM "${table}"`,
      );
      out[table] = Number(rows[0]?.c ?? 0);
    }
    const { rows: total } = await client.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`,
    );
    out["__table_count"] = Number(total[0]?.c ?? 0);
    const { rows: sum } = await client.query<{ c: string }>(
      `
      SELECT COALESCE(SUM(row_count), 0)::text AS c FROM (
        SELECT (xpath('/row/cnt/text()', query_to_xml(format('SELECT COUNT(*) AS cnt FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text::int AS row_count
        FROM information_schema.tables
        WHERE table_schema='public' AND table_type='BASE TABLE'
      ) s
      `,
    );
    out["__total_rows"] = Number(sum[0]?.c ?? 0);
  } finally {
    client.release();
    await pool.end();
  }
  return out;
}
