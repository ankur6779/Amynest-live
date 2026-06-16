import { parseApiJson } from "@/lib/safe-json-response";
/**
 * Poll server-side admin ops flags (streaming/API disable, emergency mode, safe mode).
 */

import { getApiUrl } from "@/lib/api";

export type AdminAudioOps = {
  disableStreaming: boolean;
  disableApi: boolean;
  disableMseStreaming: boolean;
  forceEmergencyMode: boolean;
  safeMode: boolean;
  pregenerationPaused: boolean;
  reduceDbReads: boolean;
  cacheDisabled: boolean;
  selfHealEnabled: boolean;
  streamingEnabled: boolean;
  mseStreamingEnabled: boolean;
  apiEnabled: boolean;
  cacheEnabled: boolean;
  degradedMode: boolean;
  apiUsageFactor: number;
  streamingWeightFactor: number;
  prefetchDepth: number;
  layerWeights?: {
    static: number;
    cache: number;
    api: number;
    streaming: number;
    elevenlabs: number;
  };
  cacheClearedAt: number | null;
  updatedAt: number;
};

let cachedOps: AdminAudioOps = {
  disableStreaming: false,
  disableApi: false,
  disableMseStreaming: true,
  forceEmergencyMode: false,
  safeMode: false,
  pregenerationPaused: false,
  reduceDbReads: false,
  cacheDisabled: false,
  selfHealEnabled: true,
  streamingEnabled: true,
  mseStreamingEnabled: false,
  apiEnabled: true,
  cacheEnabled: true,
  degradedMode: false,
  apiUsageFactor: 1,
  streamingWeightFactor: 1,
  prefetchDepth: 1,
  cacheClearedAt: null,
  updatedAt: 0,
};

let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastSeenCacheClear = 0;

export function getAdminAudioOps(): AdminAudioOps {
  return cachedOps;
}

export function isAdminStreamingDisabled(): boolean {
  return cachedOps.disableStreaming;
}

/** Runtime MSE kill switch — polled from /api/audio-ops (no redeploy). */
export function isAdminMseStreamingDisabled(): boolean {
  return cachedOps.disableMseStreaming !== false;
}

export function isAdminApiDisabled(): boolean {
  return cachedOps.disableApi;
}

export function isAdminEmergencyForced(): boolean {
  return cachedOps.forceEmergencyMode || cachedOps.safeMode;
}

export function isSafeModeActive(): boolean {
  return cachedOps.safeMode;
}

export function isSystemApiHealthy(): boolean {
  return cachedOps.apiEnabled && !cachedOps.disableApi;
}

export function isSystemStreamingHealthy(): boolean {
  return cachedOps.streamingEnabled && !cachedOps.disableStreaming;
}

export function isCacheDisabled(): boolean {
  return cachedOps.cacheDisabled || cachedOps.cacheEnabled === false;
}

export function isDegradedModeActive(): boolean {
  return cachedOps.degradedMode;
}

export function getPredictivePrefetchDepth(): number {
  return Math.max(1, Math.min(2, cachedOps.prefetchDepth || 1));
}

export function shouldSkipApiForPredictiveThrottle(): boolean {
  if (cachedOps.degradedMode && cachedOps.apiUsageFactor < 1) {
    return Math.random() > cachedOps.apiUsageFactor;
  }
  return false;
}

async function fetchOps(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { getFirebaseAuth } = await import("@/lib/firebase");
    const user = getFirebaseAuth().currentUser;
    if (!user) return;

    const token = await user.getIdToken().catch(() => null);
    if (!token) return;

    const res = await fetch(getApiUrl("/api/audio-ops"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;

    const ops = (await parseApiJson<AdminAudioOps>(res));
    cachedOps = {
      ...ops,
      disableMseStreaming:
        ops.disableMseStreaming ??
        (ops.mseStreamingEnabled === true ? false : true),
      streamingEnabled: ops.streamingEnabled ?? !ops.disableStreaming,
      mseStreamingEnabled:
        ops.mseStreamingEnabled ?? ops.disableMseStreaming === false,
      apiEnabled: ops.apiEnabled ?? !ops.disableApi,
      safeMode: ops.safeMode ?? false,
      pregenerationPaused: ops.pregenerationPaused ?? false,
      reduceDbReads: ops.reduceDbReads ?? false,
      cacheDisabled: ops.cacheDisabled ?? false,
      selfHealEnabled: ops.selfHealEnabled ?? true,
      cacheEnabled: ops.cacheEnabled ?? !ops.cacheDisabled,
      degradedMode: ops.degradedMode ?? false,
      apiUsageFactor: ops.apiUsageFactor ?? 1,
      streamingWeightFactor: ops.streamingWeightFactor ?? 1,
      prefetchDepth: ops.prefetchDepth ?? 1,
      layerWeights: ops.layerWeights,
    };

    if (ops.cacheClearedAt && ops.cacheClearedAt > lastSeenCacheClear) {
      lastSeenCacheClear = ops.cacheClearedAt;
      void clearLocalAudioCaches();
    }
  } catch {
    /* best-effort */
  }
}

async function clearLocalAudioCaches(): Promise<void> {
  try {
    const { clearAllLocalCachedAudio } = await import("@/lib/local-tts-cache");
    await clearAllLocalCachedAudio();
  } catch {
    /* optional */
  }
}

export function startAdminAudioOpsPolling(): void {
  if (typeof window === "undefined" || pollTimer) return;
  void fetchOps();
  pollTimer = window.setInterval(() => void fetchOps(), 30_000) as unknown as ReturnType<
    typeof setInterval
  >;
}

export function stopAdminAudioOpsPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** Test-only reset. */
export function resetAdminAudioOpsForTests(): void {
  cachedOps = {
    disableStreaming: false,
    disableApi: false,
    disableMseStreaming: true,
    forceEmergencyMode: false,
    safeMode: false,
    pregenerationPaused: false,
    reduceDbReads: false,
    cacheDisabled: false,
    selfHealEnabled: true,
    streamingEnabled: true,
    mseStreamingEnabled: false,
    apiEnabled: true,
    cacheEnabled: true,
    degradedMode: false,
    apiUsageFactor: 1,
    streamingWeightFactor: 1,
    prefetchDepth: 1,
    cacheClearedAt: null,
    updatedAt: 0,
  };
  lastSeenCacheClear = 0;
  stopAdminAudioOpsPolling();
}
