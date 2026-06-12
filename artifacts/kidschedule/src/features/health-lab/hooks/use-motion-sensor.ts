import { useCallback, useEffect, useRef, useState } from "react";
import { trackPermissionDenied } from "../health-lab-analytics";
import type { MotionSample, MotionSensorState } from "../types";

function variance(samples: MotionSample[]): number {
  if (samples.length < 2) return 0;
  const xs = samples.map((s) => s.x);
  const ys = samples.map((s) => s.y);
  const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
  const varX = xs.reduce((a, v) => a + (v - meanX) ** 2, 0) / xs.length;
  const varY = ys.reduce((a, v) => a + (v - meanY) ** 2, 0) / ys.length;
  return Math.sqrt(varX + varY);
}

function stabilityFromVariance(v: number): number {
  return Math.max(0, Math.min(100, 100 - v * 800));
}

/** Accelerometer / gyroscope with graceful desktop simulation fallback. */
export function useMotionSensor(
  active: boolean,
  trackingChildId?: number,
): MotionSensorState & {
  start: () => Promise<boolean>;
  stop: () => void;
  resetSamples: () => void;
  peakVariance: number;
} {
  const [state, setState] = useState<MotionSensorState>({
    available: false,
    simulated: false,
    permissionGranted: false,
    permissionDenied: false,
    latest: null,
    variance: 0,
    stabilityPercent: 100,
  });

  const samplesRef = useRef<MotionSample[]>([]);
  const peakVarianceRef = useRef(0);
  const simRef = useRef<number | null>(null);
  const handlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);

  const updateFromSample = useCallback((sample: MotionSample) => {
    const buf = samplesRef.current;
    buf.push(sample);
    if (buf.length > 60) buf.shift();
    const v = variance(buf);
    peakVarianceRef.current = Math.max(peakVarianceRef.current, v);
    setState((prev) => ({
      ...prev,
      latest: sample,
      variance: v,
      stabilityPercent: stabilityFromVariance(v),
    }));
  }, []);

  const startSimulation = useCallback((denied = false) => {
    if (denied && trackingChildId != null) {
      trackPermissionDenied(trackingChildId, "devicemotion");
    }
    setState((prev) => ({
      ...prev,
      available: true,
      simulated: true,
      permissionGranted: !denied,
      permissionDenied: denied,
    }));
    let t = 0;
    const tick = () => {
      if (document.hidden) {
        simRef.current = window.setTimeout(tick, 200);
        return;
      }
      t += 0.05;
      const wobble = Math.sin(t * 3) * 0.02 + Math.sin(t * 7) * 0.01;
      updateFromSample({
        x: wobble,
        y: Math.cos(t * 2) * 0.015,
        z: 0,
        timestamp: Date.now(),
      });
      simRef.current = window.setTimeout(tick, 100);
    };
    tick();
  }, [updateFromSample, trackingChildId]);

  const stopSimulation = useCallback(() => {
    if (simRef.current != null) {
      clearTimeout(simRef.current);
      simRef.current = null;
    }
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    samplesRef.current = [];
    peakVarianceRef.current = 0;

    if (typeof window === "undefined") return false;

    const hasMotion = "DeviceMotionEvent" in window;
    if (!hasMotion) {
      startSimulation(false);
      return true;
    }

    try {
      const DM = DeviceMotionEvent as typeof DeviceMotionEvent & {
        requestPermission?: () => Promise<"granted" | "denied">;
      };
      if (typeof DM.requestPermission === "function") {
        const perm = await DM.requestPermission();
        if (perm !== "granted") {
          startSimulation(true);
          return true;
        }
      }

      const handler = (e: DeviceMotionEvent) => {
        if (document.hidden) return;
        const acc = e.accelerationIncludingGravity;
        if (!acc) return;
        updateFromSample({
          x: acc.x ?? 0,
          y: acc.y ?? 0,
          z: acc.z ?? 0,
          timestamp: Date.now(),
        });
      };

      handlerRef.current = handler;
      window.addEventListener("devicemotion", handler);
      setState((prev) => ({
        ...prev,
        available: true,
        simulated: false,
        permissionGranted: true,
        permissionDenied: false,
      }));
      return true;
    } catch {
      startSimulation(true);
      return true;
    }
  }, [startSimulation, updateFromSample]);

  const stop = useCallback(() => {
    stopSimulation();
    if (handlerRef.current) {
      window.removeEventListener("devicemotion", handlerRef.current);
      handlerRef.current = null;
    }
  }, [stopSimulation]);

  const resetSamples = useCallback(() => {
    samplesRef.current = [];
    peakVarianceRef.current = 0;
    setState((prev) => ({ ...prev, variance: 0, stabilityPercent: 100 }));
  }, []);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }
    void start();
    return stop;
  }, [active, start, stop]);

  return {
    ...state,
    start,
    stop,
    resetSamples,
    peakVariance: peakVarianceRef.current,
  };
}
