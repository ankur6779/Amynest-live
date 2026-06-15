import { logger } from "../lib/logger.js";

export type ConvoLatencySample = {
  ts?: number;
  platform: "ios" | "android" | "web";
  sttMs: number | null;
  llmMs: number | null;
  ttsMs: number | null;
  ttfaMs: number | null;
  e2eMs: number;
  error?: string;
};

const MAX_SAMPLES = 5_000;
const samples: ConvoLatencySample[] = [];
let errorTotal = 0;

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? null;
}

function nums(values: (number | null | undefined)[]): number[] {
  return values.filter((v): v is number => typeof v === "number" && v >= 0);
}

export function recordConvoLatencySamples(batch: ConvoLatencySample[]): number {
  let accepted = 0;
  for (const sample of batch) {
    if (sample.error) errorTotal += 1;
    samples.push({ ...sample, ts: sample.ts ?? Date.now() });
    accepted += 1;
  }
  if (samples.length > MAX_SAMPLES) samples.splice(0, samples.length - MAX_SAMPLES);
  logger.info(
    {
      evt: "speech.converse.latency",
      platform: batch[0]?.platform,
      e2eMs: batch[0]?.e2eMs,
      count: batch.length,
    },
    "talk with amy latency sample",
  );
  return accepted;
}

export function getConvoLatencyDashboard(): Record<string, unknown> {
  const e2e = nums(samples.map((s) => s.e2eMs));
  const stt = nums(samples.map((s) => s.sttMs));
  const llm = nums(samples.map((s) => s.llmMs));
  const tts = nums(samples.map((s) => s.ttsMs));
  const ttfa = nums(samples.map((s) => s.ttfaMs));
  const total = samples.length;
  const byPlatform = (p: ConvoLatencySample["platform"]) =>
    samples.filter((s) => s.platform === p);

  return {
    talk_with_amy_samples: total,
    talk_with_amy_error_rate_pct:
      total > 0 ? Math.round((errorTotal / total) * 1000) / 10 : null,
    e2e_ms_p50: percentile(e2e, 50),
    e2e_ms_p95: percentile(e2e, 95),
    stt_ms_p50: percentile(stt, 50),
    stt_ms_p95: percentile(stt, 95),
    llm_ms_p50: percentile(llm, 50),
    llm_ms_p95: percentile(llm, 95),
    tts_ms_p50: percentile(tts, 50),
    tts_ms_p95: percentile(tts, 95),
    ttfa_ms_p50: percentile(ttfa, 50),
    ttfa_ms_p95: percentile(ttfa, 95),
    ios_e2e_ms_p50: percentile(nums(byPlatform("ios").map((s) => s.e2eMs)), 50),
    android_e2e_ms_p50: percentile(nums(byPlatform("android").map((s) => s.e2eMs)), 50),
    web_e2e_ms_p50: percentile(nums(byPlatform("web").map((s) => s.e2eMs)), 50),
  };
}

export function resetConvoMetricsForTests(): void {
  samples.length = 0;
  errorTotal = 0;
}
