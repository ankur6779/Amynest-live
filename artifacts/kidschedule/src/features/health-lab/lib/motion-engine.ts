/** Amy Health Lab™ — calibrated motion processing pipeline */

import type { MotionSample } from "../types";

export interface MotionBaseline {
  /** Resting accelerometer orientation */
  orientation: { x: number; y: number; z: number };
  /** Gyro noise floor from calibration samples */
  gyroNoise: number;
  /** Accelerometer variance at rest */
  accelVariance: number;
  calibratedAt: number;
}

export interface ProcessedMotion {
  tiltX: number;
  tiltY: number;
  variance: number;
  stabilityPercent: number;
  confidence: number;
  trackingQuality: "excellent" | "good" | "fair" | "poor";
  sensorHealth: "healthy" | "noisy" | "unstable";
  balanceZone: "balanced" | "wobbling" | "unstable";
}

export interface SmoothingState {
  tiltX: number;
  tiltY: number;
  variance: number;
}

const SMOOTHING_ALPHA = 0.18;
const VARIANCE_SCALE = 650;
const DRIFT_CORRECTION_RATE = 0.002;

export function createDefaultBaseline(): MotionBaseline {
  return {
    orientation: { x: 0, y: 0, z: 9.81 },
    gyroNoise: 0.01,
    accelVariance: 0.005,
    calibratedAt: Date.now(),
  };
}

function sampleVariance(samples: MotionSample[]): number {
  if (samples.length < 2) return 0;
  const xs = samples.map((s) => s.x);
  const ys = samples.map((s) => s.y);
  const zs = samples.map((s) => s.z);
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const mx = mean(xs);
  const my = mean(ys);
  const mz = mean(zs);
  const varX = xs.reduce((a, v) => a + (v - mx) ** 2, 0) / xs.length;
  const varY = ys.reduce((a, v) => a + (v - my) ** 2, 0) / ys.length;
  const varZ = zs.reduce((a, v) => a + (v - mz) ** 2, 0) / zs.length;
  return Math.sqrt(varX + varY + varZ);
}

/** Collect baseline from still-device calibration samples (≥500ms). */
export function calibrateBaseline(samples: MotionSample[]): MotionBaseline {
  if (samples.length === 0) return createDefaultBaseline();

  const xs = samples.map((s) => s.x);
  const ys = samples.map((s) => s.y);
  const zs = samples.map((s) => s.z);
  const n = samples.length;
  const orientation = {
    x: xs.reduce((a, b) => a + b, 0) / n,
    y: ys.reduce((a, b) => a + b, 0) / n,
    z: zs.reduce((a, b) => a + b, 0) / n,
  };

  const deltas = samples.slice(1).map((s, i) => {
    const prev = samples[i];
    return Math.sqrt((s.x - prev.x) ** 2 + (s.y - prev.y) ** 2 + (s.z - prev.z) ** 2);
  });
  const gyroNoise =
    deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0.01;

  return {
    orientation,
    gyroNoise: Math.max(0.001, gyroNoise),
    accelVariance: Math.max(0.001, sampleVariance(samples)),
    calibratedAt: Date.now(),
  };
}

function applyDriftCorrection(
  raw: MotionSample,
  baseline: MotionBaseline,
  driftAccum: { x: number; y: number },
): { x: number; y: number; z: number } {
  const dx = raw.x - baseline.orientation.x - driftAccum.x;
  const dy = raw.y - baseline.orientation.y - driftAccum.y;
  const dz = raw.z - baseline.orientation.z;

  driftAccum.x += (raw.x - baseline.orientation.x) * DRIFT_CORRECTION_RATE;
  driftAccum.y += (raw.y - baseline.orientation.y) * DRIFT_CORRECTION_RATE;

  return { x: dx, y: dy, z: dz };
}

function exponentialSmooth(prev: number, next: number, alpha = SMOOTHING_ALPHA): number {
  return prev + alpha * (next - prev);
}

function noiseFilter(value: number, noiseFloor: number): number {
  const abs = Math.abs(value);
  if (abs < noiseFloor) return 0;
  return value > 0 ? abs - noiseFloor : -(abs - noiseFloor);
}

function stabilityFromVariance(v: number, baseline: MotionBaseline): number {
  const adjusted = Math.max(0, v - baseline.accelVariance * 0.5);
  return Math.max(0, Math.min(100, 100 - adjusted * VARIANCE_SCALE));
}

function computeConfidence(
  variance: number,
  baseline: MotionBaseline,
  sampleCount: number,
): number {
  const noiseRatio = variance / (baseline.gyroNoise + 0.001);
  const sampleFactor = Math.min(1, sampleCount / 30);
  const raw = 100 - noiseRatio * 15;
  return Math.max(0, Math.min(100, raw * sampleFactor));
}

function trackingQualityFromConfidence(c: number): ProcessedMotion["trackingQuality"] {
  if (c >= 80) return "excellent";
  if (c >= 60) return "good";
  if (c >= 35) return "fair";
  return "poor";
}

function balanceZoneFromStability(s: number): ProcessedMotion["balanceZone"] {
  if (s >= 70) return "balanced";
  if (s >= 45) return "wobbling";
  return "unstable";
}

export function createSmoothingState(): SmoothingState {
  return { tiltX: 0, tiltY: 0, variance: 0 };
}

/** Process a raw accelerometer sample through the full pipeline. */
export function processMotionSample(
  raw: MotionSample,
  baseline: MotionBaseline,
  buffer: MotionSample[],
  smoothing: SmoothingState,
  driftAccum: { x: number; y: number },
): ProcessedMotion {
  const corrected = applyDriftCorrection(raw, baseline, driftAccum);

  const filteredX = noiseFilter(corrected.x, baseline.gyroNoise);
  const filteredY = noiseFilter(corrected.y, baseline.gyroNoise);

  smoothing.tiltX = exponentialSmooth(smoothing.tiltX, filteredX);
  smoothing.tiltY = exponentialSmooth(smoothing.tiltY, filteredY);

  buffer.push(raw);
  if (buffer.length > 60) buffer.shift();
  const variance = sampleVariance(buffer);
  smoothing.variance = exponentialSmooth(smoothing.variance, variance, 0.25);

  const stabilityPercent = stabilityFromVariance(smoothing.variance, baseline);
  const confidence = computeConfidence(smoothing.variance, baseline, buffer.length);

  const sensorHealth: ProcessedMotion["sensorHealth"] =
    smoothing.variance > baseline.accelVariance * 8
      ? "unstable"
      : smoothing.variance > baseline.accelVariance * 3
        ? "noisy"
        : "healthy";

  return {
    tiltX: smoothing.tiltX,
    tiltY: smoothing.tiltY,
    variance: smoothing.variance,
    stabilityPercent,
    confidence,
    trackingQuality: trackingQualityFromConfidence(confidence),
    sensorHealth,
    balanceZone: balanceZoneFromStability(stabilityPercent),
  };
}
