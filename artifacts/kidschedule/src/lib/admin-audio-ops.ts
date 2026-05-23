/**
 * Poll server-side admin ops flags (streaming/API disable, emergency mode).
 */

import { getApiUrl } from "@/lib/api";

export type AdminAudioOps = {
  disableStreaming: boolean;
  disableApi: boolean;
  forceEmergencyMode: boolean;
  cacheClearedAt: number | null;
  updatedAt: number;
};

let cachedOps: AdminAudioOps = {
  disableStreaming: false,
  disableApi: false,
  forceEmergencyMode: false,
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

export function isAdminApiDisabled(): boolean {
  return cachedOps.disableApi;
}

export function isAdminEmergencyForced(): boolean {
  return cachedOps.forceEmergencyMode;
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

    const ops = (await res.json()) as AdminAudioOps;
    cachedOps = ops;

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
    forceEmergencyMode: false,
    cacheClearedAt: null,
    updatedAt: 0,
  };
  lastSeenCacheClear = 0;
  stopAdminAudioOpsPolling();
}
