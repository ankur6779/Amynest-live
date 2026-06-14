import { describe, expect, it } from "vitest";
import {
  calibrateBaseline,
  createSmoothingState,
  processMotionSample,
} from "./motion-engine";
import type { MotionSample } from "../types";

function stillSamples(count: number, base = { x: 0.1, y: 0.2, z: 9.8 }): MotionSample[] {
  return Array.from({ length: count }, (_, i) => ({
    ...base,
    timestamp: Date.now() + i * 50,
  }));
}

function wobbleSamples(count: number): MotionSample[] {
  return Array.from({ length: count }, (_, i) => ({
    x: Math.sin(i * 0.5) * 0.3,
    y: Math.cos(i * 0.4) * 0.25,
    z: 9.8 + Math.sin(i) * 0.1,
    timestamp: Date.now() + i * 50,
  }));
}

describe("motion-engine", () => {
  it("calibrates baseline from still samples", () => {
    const baseline = calibrateBaseline(stillSamples(30));
    expect(baseline.orientation.x).toBeCloseTo(0.1, 1);
    expect(baseline.orientation.y).toBeCloseTo(0.2, 1);
    expect(baseline.gyroNoise).toBeLessThan(0.01);
  });

  it("produces high stability for still device after calibration", () => {
    const baseline = calibrateBaseline(stillSamples(30));
    const buffer: MotionSample[] = [];
    const smoothing = createSmoothingState();
    const drift = { x: 0, y: 0 };

    let result = processMotionSample(stillSamples(1)[0], baseline, buffer, smoothing, drift);
    for (let i = 0; i < 40; i++) {
      result = processMotionSample(
        { x: 0.1 + (Math.random() - 0.5) * 0.002, y: 0.2, z: 9.8, timestamp: Date.now() },
        baseline,
        buffer,
        smoothing,
        drift,
      );
    }
    expect(result.stabilityPercent).toBeGreaterThan(70);
    expect(result.balanceZone).toBe("balanced");
  });

  it("detects wobble as unstable", () => {
    const baseline = calibrateBaseline(stillSamples(30));
    const buffer: MotionSample[] = [];
    const smoothing = createSmoothingState();
    const drift = { x: 0, y: 0 };

    let result = processMotionSample(stillSamples(1)[0], baseline, buffer, smoothing, drift);
    for (const sample of wobbleSamples(50)) {
      result = processMotionSample(sample, baseline, buffer, smoothing, drift);
    }
    expect(result.stabilityPercent).toBeLessThan(60);
    expect(["wobbling", "unstable"]).toContain(result.balanceZone);
  });

  it("smooths sudden jumps", () => {
    const baseline = calibrateBaseline(stillSamples(30));
    const buffer: MotionSample[] = [];
    const smoothing = createSmoothingState();
    const drift = { x: 0, y: 0 };

    for (const s of stillSamples(20)) {
      processMotionSample(s, baseline, buffer, smoothing, drift);
    }
    const beforeJump = smoothing.tiltX;
    processMotionSample({ x: 2, y: 0, z: 9.8, timestamp: Date.now() }, baseline, buffer, smoothing, drift);
    expect(Math.abs(smoothing.tiltX - beforeJump)).toBeLessThan(1);
  });
});
