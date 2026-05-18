/**
 * AmyNest stability load test — API + health under concurrent users.
 *
 * Usage:
 *   STABILITY_BASE_URL=https://api.amynest.in \
 *   STABILITY_AUTH_TOKEN=<firebase-jwt> \
 *   pnpm --filter @workspace/scripts run stability-load
 *
 * Optional:
 *   STABILITY_USERS=50 STABILITY_BATCH=10 STABILITY_AI_REQUESTS=5
 */
const BASE = (
  process.env.STABILITY_BASE_URL ??
  process.env.API_PUBLIC_URL ??
  "http://localhost:5000"
).replace(/\/$/, "");
const USERS = Math.max(1, Number(process.env.STABILITY_USERS ?? "30"));
const BATCH = Math.max(1, Number(process.env.STABILITY_BATCH ?? "10"));
const AI_PER_USER = Math.max(0, Number(process.env.STABILITY_AI_REQUESTS ?? "2"));
const TOKEN = process.env.STABILITY_AUTH_TOKEN ?? "";

type Sample = {
  ok: boolean;
  status: number;
  ms: number;
  label: string;
  error?: string;
};

const samples: Sample[] = [];
const errors: string[] = [];

async function timedFetch(
  label: string,
  path: string,
  init?: RequestInit,
): Promise<Sample> {
  const started = performance.now();
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    };
    if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(12_000),
    });
    const ms = Math.round(performance.now() - started);
    const ok = res.status < 500;
    if (!ok) {
      const body = await res.text().catch(() => "");
      errors.push(`${label} HTTP ${res.status}: ${body.slice(0, 120)}`);
    }
    return { ok, status: res.status, ms, label };
  } catch (err) {
    const ms = Math.round(performance.now() - started);
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`${label}: ${message}`);
    return { ok: false, status: 0, ms, label, error: message };
  }
}

async function virtualUser(index: number): Promise<void> {
  const uid = `load-u${index}`;

  await timedFetch(`health-${uid}`, "/health");
  await timedFetch(`healthz-${uid}`, "/api/healthz");

  for (let i = 0; i < AI_PER_USER; i++) {
    if (!TOKEN) break;
    const body = {
      question: `Stability test ${uid} request ${i}: bedtime routine tips?`,
      childName: "Test",
      childAge: 5,
    };
    const r = await timedFetch(`ai-assistant-${uid}-${i}`, "/api/ai/assistant-ai", {
      method: "POST",
      body: JSON.stringify(body),
    });
    samples.push(r);

    // 202 = async AI job accepted (queue working under load)
    void r.status;
  }
}

async function runInBatches<T>(
  total: number,
  batchSize: number,
  fn: (i: number) => Promise<T>,
): Promise<T[]> {
  const out: T[] = [];
  for (let start = 0; start < total; start += batchSize) {
    const chunk = Array.from(
      { length: Math.min(batchSize, total - start) },
      (_, j) => fn(start + j),
    );
    out.push(...(await Promise.all(chunk)));
  }
  return out;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

async function main(): Promise<void> {
  console.log("\n🧪 AmyNest stability load test");
  console.log(`   base: ${BASE}`);
  console.log(`   users: ${USERS} (batch ${BATCH})`);
  console.log(`   ai requests/user: ${AI_PER_USER}${TOKEN ? "" : " (no token — AI skipped)"}\n`);

  const started = performance.now();
  await runInBatches(USERS, BATCH, async (i) => {
    const health = await timedFetch(`user-${i}-health`, "/health");
    samples.push(health);
    await virtualUser(i);
  });

  const elapsed = Math.round(performance.now() - started);
  const okCount = samples.filter((s) => s.ok).length;
  const ms = samples.map((s) => s.ms).sort((a, b) => a - b);

  console.log("── Results ──");
  console.log(`   total requests: ${samples.length}`);
  console.log(`   success: ${okCount}/${samples.length}`);
  console.log(`   duration: ${elapsed}ms`);
  console.log(`   latency p50: ${percentile(ms, 50)}ms`);
  console.log(`   latency p95: ${percentile(ms, 95)}ms`);
  console.log(`   latency max: ${ms[ms.length - 1] ?? 0}ms`);

  if (errors.length > 0) {
    console.log("\n── Errors (sample) ──");
    for (const e of errors.slice(0, 15)) console.log(`   • ${e}`);
    if (errors.length > 15) console.log(`   … +${errors.length - 15} more`);
  }

  const failRate = samples.length > 0 ? 1 - okCount / samples.length : 0;
  if (failRate > 0.15) {
    console.error("\n❌ FAIL: >15% requests failed\n");
    process.exit(1);
  }
  console.log("\n✅ PASS: stability thresholds met\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
