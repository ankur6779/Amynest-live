/**
 * Microphone permission — always re-prompt on feature use when the user skipped
 * startup permissions. Never treat Permissions API "denied" as final without
 * calling getUserMedia inside a user gesture (Speech Coach, Cry Insight, etc.).
 */

import { isAndroidInstalledPwa, isAndroidUa } from "@/lib/device-lite";
import {
  isCapacitorIosNative,
  MicPermissionCapacitor,
  prepareIosAudioSessionForRecording,
  requestIosMicrophoneAccess,
} from "@/lib/mic-permission-capacitor";

export type MicrophoneAccessResult =
  | { granted: true }
  | { granted: false; reason: "denied" | "unavailable" };

export type MicrophoneStreamResult =
  | { ok: true; stream: MediaStream }
  | { ok: false; reason: "denied" | "unavailable" };

let cache: "unknown" | "granted" | "denied" = "unknown";
let inFlight: Promise<MicrophoneAccessResult> | null = null;
let visibilityWired = false;

function isAndroidWebViewWrapper(): boolean {
  try {
    return /AmyNestAndroid/.test(navigator.userAgent);
  } catch {
    return false;
  }
}

function prefersGetUserMediaTruth(forFeature: boolean): boolean {
  return (
    forFeature ||
    isAndroidWebViewWrapper() ||
    isCapacitorIosNative() ||
    isAndroidInstalledPwa() ||
    isAndroidUa()
  );
}

/** Clear cached mic state (e.g. user returned from system Settings). */
export function resetMicrophonePermissionCache(): void {
  cache = "unknown";
  inFlight = null;
}

function wireCacheResetOnForeground(): void {
  if (visibilityWired || typeof document === "undefined" || typeof window === "undefined") {
    return;
  }
  visibilityWired = true;
  const onForeground = () => {
    try {
      if (document.visibilityState === "visible") resetMicrophonePermissionCache();
    } catch {
      /* ignore */
    }
  };
  document.addEventListener("visibilitychange", onForeground);
  window.addEventListener("pageshow", onForeground);
}

/**
 * @param forFeature — pass true on every user tap that needs the mic (Speech Coach,
 * Cry Insight, etc.) so a skipped startup permission still triggers the OS dialog.
 */
export async function requestMicrophoneAccess(options?: {
  forFeature?: boolean;
}): Promise<MicrophoneAccessResult> {
  const forFeature = options?.forFeature ?? false;
  wireCacheResetOnForeground();

  if (forFeature) {
    resetMicrophonePermissionCache();
  } else if (cache === "denied" && isCapacitorIosNative()) {
    cache = "unknown";
  }

  if (!forFeature && cache !== "unknown") {
    return cache === "granted"
      ? { granted: true }
      : { granted: false, reason: "denied" };
  }

  if (!forFeature && inFlight) return inFlight;

  const run = async (): Promise<MicrophoneAccessResult> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return { granted: false, reason: "unavailable" };
    }

    if (isCapacitorIosNative()) {
      await prepareIosAudioSessionForRecording();
      const ios = await requestIosMicrophoneAccess();
      if (ios === "granted") {
        cache = "granted";
        return { granted: true };
      }
      if (ios === "denied" && !forFeature) {
        cache = "denied";
        return { granted: false, reason: "denied" };
      }
    }

    const skipPermissionsQuery = prefersGetUserMediaTruth(forFeature);

    if (!skipPermissionsQuery && navigator.permissions) {
      try {
        const status = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        if (status.state === "granted") {
          cache = "granted";
          return { granted: true };
        }
        // On feature use, never skip getUserMedia when API says "denied" — user may
        // have skipped startup without a real deny; getUserMedia is the truth.
        if (!forFeature && status.state === "denied") {
          cache = "denied";
          return { granted: false, reason: "denied" };
        }
      } catch {
        /* Permissions API unsupported */
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      cache = "granted";
      return { granted: true };
    } catch {
      if (isCapacitorIosNative()) {
        try {
          const { status } = await MicPermissionCapacitor.getMicrophoneStatus();
          if (status === "granted") {
            cache = "granted";
            return { granted: true };
          }
        } catch {
          /* ignore */
        }
      }
      // Feature taps should retry on next tap (user may allow in settings).
      if (!forFeature) cache = "denied";
      return { granted: false, reason: "denied" };
    }
  };

  if (forFeature) return run();

  inFlight = run().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Open a mic stream for recording; defaults to forFeature (re-prompt when needed). */
export async function openMicrophoneStream(
  audioConstraints: boolean | MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  options?: { forFeature?: boolean },
): Promise<MicrophoneStreamResult> {
  const forFeature = options?.forFeature ?? true;

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: "unavailable" };
  }

  if (isCapacitorIosNative()) {
    await prepareIosAudioSessionForRecording();
  }

  const access = await requestMicrophoneAccess({ forFeature });
  if (!access.granted) {
    return { ok: false, reason: access.reason };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    cache = "granted";
    return { ok: true, stream };
  } catch {
    resetMicrophonePermissionCache();
    return { ok: false, reason: "denied" };
  }
}
