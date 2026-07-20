/**
 * Audio subsystem load test — static-audio, spelling-library, optional TTS playback.
 *
 * Usage:
 *   AUDIO_LOAD_BASE_URL=https://www.amynest.in pnpm run load:audio
 *   AUDIO_LOAD_BASE_URL=http://localhost:5000 AUDIO_LOAD_CONCURRENCY=50 pnpm run load:audio
 *
 * Optional:
 *   AUDIO_LOAD_STATIC_HASH=ff74291468e5322c612357c6f74701e8
 *   AUDIO_LOAD_TTS_SHA256=<cached-tts-hash>  (GET /api/tts/audio/{sha}.mp3)
 *   AUDIO_LOAD_P95_MS=2000  AUDIO_LOAD_MAX_FAIL_RATE=0.05
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "./static-audio-paths.js";

const BASE = (
  process.env.AUDIO_LOAD_BASE_URL ??
  process.env.API_PUBLIC_URL ??
  "http://localhost:5000"
).replace(/\/$/, "");

const CONCURRENCY = Math.max(1, Number(process.env.AUDIO_LOAD_CONCURRENCY ?? "50"));
const P95_LIMIT_MS = Math.max(100, Number(process.env.AUDIO_LOAD_P95_MS ?? "2000"));
const MAX_FAIL_RATE = Math.max(0, Number(process.env.AUDIO_LOAD_MAX_FAIL_RATE ?? "0.05"));

type Sample = {
  ok: boolean;
  status: number;
  ms: number;
  label: string;
  error?: string;
};

const samples: Sample[] = [];
const errors: string[] = [];

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)]!;
}

function pickDefaultStaticHash(): string {
  const fromEnv = (process.env.AUDIO_LOAD_STATIC_HASH ?? "").trim();
  if (/^[a-f0-9]{32}$/i.test(fromEnv)) return fromEnv.toLowerCase();

  const mapPath = resolve(
    REPO_ROOT,
    "artifacts/kidschedule/src/data/static-audio-map.json",
  );
  try {
    const map = JSON.parse(readFileSync(mapPath, "utf8")) as {
      default?: Record<string, string>;
    };
    const firstUrl = Object.values(map.default ?? {})[0] ?? "";
    const match =
      firstUrl.match(/static-audio\/([a-f0-9]{32})\.mp3/i) ??
      firstUrl.match(/\/api\/static-audio\/([a-f0-9]{32})\.mp3/i);
    if (match?.[1]) return match[1].toLowerCase();
  } catch {
    /* fallback below */
  }
  return "ff74291468e5322c612357c6f74701e8";
}

async function timedFetch(label: string, path: string): Promise<Sample> {
  const started = performance.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "GET",
      signal: AbortSignal.timeout(15_000),
    });
    const ms = Math.round(performance.now() - started);
    const ok = res.ok;
    if (!ok) {
      const body = await res.text().catch(() => "");
      errors.push(`${label} HTTP ${res.status}: ${body.slice(0, 100)}`);
    } else {
      // Drain body so connection closes cleanly under load
      await res.arrayBuffer().catch(() => undefined);
    }
    return { ok, status: res.status, ms, label };
  } catch (err) {
    const ms = Math.round(performance.now() - started);
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`${label}: ${message}`);
    return { ok: false, status: 0, ms, label, error: message };
  }
}

async function runConcurrent(
  count: number,
  fn: (i: number) => Promise<Sample>,
): Promise<void> {
  const batch = 10;
  for (let start = 0; start < count; start += batch) {
    const chunk = Array.from(
      { length: Math.min(batch, count - start) },
      (_, j) => fn(start + j),
    );
    samples.push(...(await Promise.all(chunk)));
  }
}

async function main(): Promise<void> {
  const staticHash = pickDefaultStaticHash();
  const ttsSha = (process.env.AUDIO_LOAD_TTS_SHA256 ?? "").trim().toLowerCase();

  console.log("\n🎧 AmyNest audio load test");
  console.log(`   base:         ${BASE}`);
  console.log(`   concurrency:  ${CONCURRENCY} per endpoint group`);
  console.log(`   static hash:  ${staticHash}`);
  console.log(`   p95 limit:    ${P95_LIMIT_MS}ms`);
  console.log(`   max fail:     ${(MAX_FAIL_RATE * 100).toFixed(0)}%\n`);

  const started = performance.now();

  await runConcurrent(CONCURRENCY, (i) =>
    timedFetch(`static-health-${i}`, "/api/static-audio/health"),
  );

  await runConcurrent(CONCURRENCY, (i) =>
    timedFetch(`static-mp3-${i}`, `/api/static-audio/${staticHash}.mp3`),
  );

  await runConcurrent(Math.min(CONCURRENCY, 30), (i) =>
    timedFetch(`spelling-mp3-${i}`, "/api/spelling-library/spelling/v2/cat.mp3"),
  );

  if (ttsSha && /^[a-f0-9]{64}$/.test(ttsSha)) {
    await runConcurrent(Math.min(CONCURRENCY, 20), (i) =>
      timedFetch(`tts-mp3-${i}`, `/api/tts/audio/${ttsSha}.mp3`),
    );
  }

  const elapsed = Math.round(performance.now() - started);
  const okCount = samples.filter((s) => s.ok).length;
  const ms = samples.map((s) => s.ms).sort((a, b) => a - b);
  const p50 = percentile(ms, 50);
  const p95 = percentile(ms, 95);
  const failRate = samples.length > 0 ? 1 - okCount / samples.length : 0;

  console.log("── Results ──");
  console.log(`   total requests: ${samples.length}`);
  console.log(`   success:        ${okCount}/${samples.length} (${((1 - failRate) * 100).toFixed(1)}%)`);
  console.log(`   duration:       ${elapsed}ms`);
  console.log(`   latency p50:    ${p50}ms`);
  console.log(`   latency p95:    ${p95}ms`);
  console.log(`   latency max:    ${ms[ms.length - 1] ?? 0}ms`);

  if (errors.length > 0) {
    console.log("\n── Errors (sample) ──");
    for (const e of errors.slice(0, 12)) console.log(`   • ${e}`);
    if (errors.length > 12) console.log(`   … +${errors.length - 12} more`);
  }

  let failed = false;
  if (failRate > MAX_FAIL_RATE) {
    console.error(`\n❌ FAIL: error rate ${(failRate * 100).toFixed(1)}% > ${(MAX_FAIL_RATE * 100).toFixed(0)}%`);
    failed = true;
  }
  if (p95 > P95_LIMIT_MS) {
    console.error(`\n❌ FAIL: p95 latency ${p95}ms > ${P95_LIMIT_MS}ms`);
    failed = true;
  }

  if (failed) {
    console.error("");
    process.exit(1);
  }

  console.log("\n✅ PASS: audio load thresholds met\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
