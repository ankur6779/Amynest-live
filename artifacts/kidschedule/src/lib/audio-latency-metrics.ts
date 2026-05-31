/**
 * Internal latency buckets for latencyReport() — not new telemetry events.
 */

import type { AudioReliabilityModule } from "@/lib/audio-reliability-telemetry";

type LatencyBucket = {
  networkMs: number[];
  decodeMs: number[];
  playMs: number[];
};

const buckets = new Map<AudioReliabilityModule, LatencyBucket>();

function bucket(module: AudioReliabilityModule): LatencyBucket {
  let b = buckets.get(module);
  if (!b) {
    b = { networkMs: [], decodeMs: [], playMs: [] };
    buckets.set(module, b);
  }
  return b;
}

function pushSample(arr: number[], ms: number, max = 200): void {
  arr.push(Math.max(0, Math.round(ms)));
  while (arr.length > max) arr.shift();
}

export function recordNetworkLatency(module: AudioReliabilityModule, ms: number): void {
  pushSample(bucket(module).networkMs, ms);
}

export function recordDecodeLatency(module: AudioReliabilityModule, ms: number): void {
  pushSample(bucket(module).decodeMs, ms);
}

export function recordPlayLatency(module: AudioReliabilityModule, ms: number): void {
  pushSample(bucket(module).playMs, ms);
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function p95(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0;
}

export function getLatencyBuckets(): Map<AudioReliabilityModule, LatencyBucket> {
  return buckets;
}

export function getModuleLatencyAverages(module: AudioReliabilityModule): {
  network: number;
  decode: number;
  play: number;
} {
  const b = bucket(module);
  return { network: avg(b.networkMs), decode: avg(b.decodeMs), play: avg(b.playMs) };
}

export function getModuleLatencyP95(module: AudioReliabilityModule): {
  network: number;
  decode: number;
  play: number;
} {
  const b = bucket(module);
  return { network: p95(b.networkMs), decode: p95(b.decodeMs), play: p95(b.playMs) };
}
