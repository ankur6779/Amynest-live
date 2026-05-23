/**
 * Hysteresis thresholds — separate enter/exit to prevent flapping.
 */

export const HYSTERESIS = {
  api: { disableAbove: 0.05, enableBelow: 0.03 },
  streaming: { disableAbove: 0.1, enableBelow: 0.06 },
  safeMode: { enterAbove: 0.05, exitBelow: 0.03 },
  dbLatency: { degradeAboveMs: 200, disableAboveMs: 300, enableBelowMs: 250 },
  workerDelay: { degradeAboveMs: 3000, disableAboveMs: 5000, enableBelowMs: 3000 },
} as const;

type LatchState = {
  apiHealthy: boolean;
  streamingHealthy: boolean;
  safeModeActive: boolean;
};

const latch: LatchState = {
  apiHealthy: true,
  streamingHealthy: true,
  safeModeActive: false,
};

export function shouldDisableApi(errorRate: number): boolean {
  return errorRate > HYSTERESIS.api.disableAbove;
}

export function shouldEnableApi(errorRate: number): boolean {
  return errorRate < HYSTERESIS.api.enableBelow;
}

export function shouldDisableStreaming(stallRate: number): boolean {
  return stallRate > HYSTERESIS.streaming.disableAbove;
}

export function shouldEnableStreaming(stallRate: number): boolean {
  return stallRate < HYSTERESIS.streaming.enableBelow;
}

export function shouldEnterSafeMode(failureRate: number): boolean {
  return failureRate > HYSTERESIS.safeMode.enterAbove;
}

export function shouldExitSafeMode(failureRate: number): boolean {
  return failureRate < HYSTERESIS.safeMode.exitBelow;
}

export function updateHealthLatches(metrics: {
  apiErrorRate: number;
  streamingStallRate: number;
  failureRate: number;
}): { apiHealthy: boolean; streamingHealthy: boolean; safeModeActive: boolean } {
  if (latch.apiHealthy && shouldDisableApi(metrics.apiErrorRate)) {
    latch.apiHealthy = false;
  } else if (!latch.apiHealthy && shouldEnableApi(metrics.apiErrorRate)) {
    latch.apiHealthy = true;
  }

  if (latch.streamingHealthy && shouldDisableStreaming(metrics.streamingStallRate)) {
    latch.streamingHealthy = false;
  } else if (!latch.streamingHealthy && shouldEnableStreaming(metrics.streamingStallRate)) {
    latch.streamingHealthy = true;
  }

  if (!latch.safeModeActive && shouldEnterSafeMode(metrics.failureRate)) {
    latch.safeModeActive = true;
  } else if (latch.safeModeActive && shouldExitSafeMode(metrics.failureRate)) {
    latch.safeModeActive = false;
  }

  return { ...latch };
}

export function getHealthLatches(): LatchState {
  return { ...latch };
}

export function setApiHealthyLatched(value: boolean): void {
  latch.apiHealthy = value;
}

export function setStreamingHealthyLatched(value: boolean): void {
  latch.streamingHealthy = value;
}

export function setSafeModeLatched(value: boolean): void {
  latch.safeModeActive = value;
}

/** Test-only reset. */
export function resetHealHysteresisForTests(): void {
  latch.apiHealthy = true;
  latch.streamingHealthy = true;
  latch.safeModeActive = false;
}
