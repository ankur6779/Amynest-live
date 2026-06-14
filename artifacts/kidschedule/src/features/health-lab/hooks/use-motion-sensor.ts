import { useCallback, useEffect, useRef, useState } from "react";
import { trackPermissionDenied } from "../health-lab-analytics";
import {
  calibrateBaseline,
  createDefaultBaseline,
  createSmoothingState,
  processMotionSample,
  type MotionBaseline,
} from "../lib/motion-engine";
import type { MotionSample, MotionSensorState } from "../types";

const CALIBRATION_MS = 3000;
const CALIBRATION_SAMPLE_INTERVAL = 50;
const UI_UPDATE_MS = 100;

/** Accelerometer with calibration, smoothing, and graceful desktop simulation. */
export function useMotionSensor(
  active: boolean,
  trackingChildId?: number,
): MotionSensorState & {
  start: () => Promise<boolean>;
  stop: () => void;
  resetSamples: () => void;
  runCalibration: () => Promise<boolean>;
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
    tiltX: 0,
    tiltY: 0,
    confidence: 0,
    trackingQuality: "fair",
    sensorHealth: "healthy",
    balanceZone: "balanced",
    calibrated: false,
    calibrating: false,
    calibrationProgress: 0,
  });

  const bufferRef = useRef<MotionSample[]>([]);
  const calibSamplesRef = useRef<MotionSample[]>([]);
  const baselineRef = useRef<MotionBaseline>(createDefaultBaseline());
  const smoothingRef = useRef(createSmoothingState());
  const driftRef = useRef({ x: 0, y: 0 });
  const peakVarianceRef = useRef(0);
  const simRef = useRef<number | null>(null);
  const calibRef = useRef<number | null>(null);
  const calibProgressRef = useRef<number | null>(null);
  const handlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);
  const activeRef = useRef(active);
  const calibratingRef = useRef(false);
  const calibratedRef = useRef(false);
  const lastUiUpdateRef = useRef(0);

  activeRef.current = active;

  const applyProcessed = useCallback((sample: MotionSample, processed: ReturnType<typeof processMotionSample>) => {
    peakVarianceRef.current = Math.max(peakVarianceRef.current, processed.variance);
    const now = Date.now();
    if (now - lastUiUpdateRef.current < UI_UPDATE_MS) return;
    lastUiUpdateRef.current = now;
    setState((prev) => ({
      ...prev,
      latest: sample,
      variance: processed.variance,
      stabilityPercent: processed.stabilityPercent,
      tiltX: processed.tiltX,
      tiltY: processed.tiltY,
      confidence: processed.confidence,
      trackingQuality: processed.trackingQuality,
      sensorHealth: processed.sensorHealth,
      balanceZone: processed.balanceZone,
    }));
  }, []);

  const ingestSample = useCallback(
    (sample: MotionSample, duringCalibration = false) => {
      if (duringCalibration) {
        calibSamplesRef.current.push(sample);
        return;
      }
      if (!state.calibrated && !state.calibrating) return;
      const processed = processMotionSample(
        sample,
        baselineRef.current,
        bufferRef.current,
        smoothingRef.current,
        driftRef.current,
      );
      applyProcessed(sample, processed);
    },
    [applyProcessed, state.calibrated, state.calibrating],
  );

  const startSimulation = useCallback(
    (denied = false) => {
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
        const sample: MotionSample = {
          x: wobble,
          y: Math.cos(t * 2) * 0.015,
          z: 9.8,
          timestamp: Date.now(),
        };
        if (calibratingRef.current) {
          calibSamplesRef.current.push(sample);
        } else if (calibratedRef.current) {
          ingestSample(sample);
        }
        simRef.current = window.setTimeout(tick, CALIBRATION_SAMPLE_INTERVAL);
      };
      tick();
    },
    [ingestSample, trackingChildId],
  );

  const stopSimulation = useCallback(() => {
    if (simRef.current != null) {
      clearTimeout(simRef.current);
      simRef.current = null;
    }
  }, []);

  const stopCalibrationTimers = useCallback(() => {
    if (calibRef.current != null) {
      clearTimeout(calibRef.current);
      calibRef.current = null;
    }
    if (calibProgressRef.current != null) {
      clearInterval(calibProgressRef.current);
      calibProgressRef.current = null;
    }
  }, []);

  const finishCalibration = useCallback(() => {
    stopCalibrationTimers();
    baselineRef.current = calibrateBaseline(calibSamplesRef.current);
    bufferRef.current = [];
    smoothingRef.current = createSmoothingState();
    driftRef.current = { x: 0, y: 0 };
    calibSamplesRef.current = [];
    setState((prev) => ({
      ...prev,
      calibrating: false,
      calibrated: true,
      calibrationProgress: 100,
    }));
    calibratingRef.current = false;
    calibratedRef.current = true;
    return true;
  }, [stopCalibrationTimers]);

  const runCalibration = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      calibSamplesRef.current = [];
      setState((prev) => ({
        ...prev,
        calibrating: true,
        calibrated: false,
        calibrationProgress: 0,
      }));
      calibratingRef.current = true;
      calibratedRef.current = false;

      const startTime = Date.now();
      calibProgressRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / CALIBRATION_MS) * 100);
        setState((prev) => ({ ...prev, calibrationProgress: progress }));
      }, 100);

      calibRef.current = window.setTimeout(() => {
        finishCalibration();
        resolve(true);
      }, CALIBRATION_MS);
    });
  }, [finishCalibration]);

  const start = useCallback(async (): Promise<boolean> => {
    bufferRef.current = [];
    calibSamplesRef.current = [];
    peakVarianceRef.current = 0;
    baselineRef.current = createDefaultBaseline();
    smoothingRef.current = createSmoothingState();
    driftRef.current = { x: 0, y: 0 };

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
        const sample: MotionSample = {
          x: acc.x ?? 0,
          y: acc.y ?? 0,
          z: acc.z ?? 0,
          timestamp: Date.now(),
        };

        setState((prev) => {
          if (prev.calibrating) {
            calibSamplesRef.current.push(sample);
            return prev;
          }
        if (!prev.calibrated) return prev;
        const processed = processMotionSample(
          sample,
          baselineRef.current,
          bufferRef.current,
          smoothingRef.current,
          driftRef.current,
        );
        peakVarianceRef.current = Math.max(peakVarianceRef.current, processed.variance);
        const now = Date.now();
        if (now - lastUiUpdateRef.current < UI_UPDATE_MS) return prev;
        lastUiUpdateRef.current = now;
        return {
            ...prev,
            latest: sample,
            variance: processed.variance,
            stabilityPercent: processed.stabilityPercent,
            tiltX: processed.tiltX,
            tiltY: processed.tiltY,
            confidence: processed.confidence,
            trackingQuality: processed.trackingQuality,
            sensorHealth: processed.sensorHealth,
            balanceZone: processed.balanceZone,
          };
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
  }, [startSimulation]);

  const stop = useCallback(() => {
    stopSimulation();
    stopCalibrationTimers();
    if (handlerRef.current) {
      window.removeEventListener("devicemotion", handlerRef.current);
      handlerRef.current = null;
    }
  }, [stopCalibrationTimers, stopSimulation]);

  const resetSamples = useCallback(() => {
    bufferRef.current = [];
    peakVarianceRef.current = 0;
    smoothingRef.current = createSmoothingState();
    driftRef.current = { x: 0, y: 0 };
    setState((prev) => ({
      ...prev,
      variance: 0,
      stabilityPercent: 100,
      tiltX: 0,
      tiltY: 0,
      balanceZone: "balanced",
    }));
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
    runCalibration,
    peakVariance: peakVarianceRef.current,
  };
}
