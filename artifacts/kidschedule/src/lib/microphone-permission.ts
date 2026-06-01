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
  | { granted: false; reason: "denied" | "blocked" | "unavailable" };

export type MicrophoneStreamResult =
  | { ok: true; stream: MediaStream }
  | { ok: false; reason: "denied" | "blocked" | "unavailable" };

/** OS / browser permission state — distinct from runtime mic usability. */
export type OsMicrophonePermissionState = "granted" | "denied" | "prompt" | "blocked" | "unknown";

export type MicrophoneRuntimeErrorCode =
  | "microphone_denied"
  | "microphone_blocked"
  | "microphone_busy"
  | "stale_stream"
  | "dead_recorder"
  | "security_error"
  | "recognition_start_failed";

export interface MicrophoneFailureClassification {
  osPermissionState: OsMicrophonePermissionState;
  errorName: string;
  errorMessage: string;
  isTruePermissionDenial: boolean;
  mappedCode: MicrophoneRuntimeErrorCode;
}

type AndroidMicrophoneStatus = "granted" | "prompt" | "denied" | "blocked" | "busy" | "requested" | "unavailable";

type AndroidMicrophoneBridge = {
  getPermissionStatus?: () => AndroidMicrophoneStatus | string;
  requestPermission?: (callbackId: string) => AndroidMicrophoneStatus | string;
  openSettings?: () => void;
  /** Native Android shell — release audio focus after TTS playback. */
  releaseAudioFocus?: () => void;
  /** Native Android shell — set MODE_IN_COMMUNICATION before getUserMedia. */
  prepareForRecording?: () => void;
};

declare global {
  interface Window {
    AndroidMicrophone?: AndroidMicrophoneBridge;
  }
}

let cache: "unknown" | "granted" | "denied" = "unknown";
let inFlight: Promise<MicrophoneAccessResult> | null = null;
let visibilityWired = false;
let nativeMicRequest: Promise<MicrophoneAccessResult> | null = null;

function isAndroidWebViewWrapper(): boolean {
  try {
    return /AmyNestAndroid/.test(navigator.userAgent) || typeof window.AndroidMicrophone !== "undefined";
  } catch {
    return false;
  }
}

function getAndroidMicrophoneBridge(): AndroidMicrophoneBridge | null {
  if (typeof window === "undefined" || !isAndroidWebViewWrapper()) return null;
  return window.AndroidMicrophone ?? null;
}

function normalizeAndroidMicrophoneStatus(status: string | undefined | null): AndroidMicrophoneStatus {
  if (
    status === "granted" ||
    status === "prompt" ||
    status === "denied" ||
    status === "blocked" ||
    status === "busy" ||
    status === "requested" ||
    status === "unavailable"
  ) {
    return status;
  }
  return "unavailable";
}

function logMicrophonePermission(message: string, detail?: unknown): void {
  try {
    if (detail === undefined) console.debug(`[amynest:mic] ${message}`);
    else console.debug(`[amynest:mic] ${message}`, detail);
  } catch {
    /* logging must not affect recording */
  }
}

function domErrorName(err: unknown): string {
  if (err instanceof DOMException) return err.name;
  if (err && typeof err === "object" && "name" in err && typeof (err as { name: unknown }).name === "string") {
    return (err as { name: string }).name;
  }
  return "UnknownError";
}

function domErrorMessage(err: unknown): string {
  if (err instanceof DOMException) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return "";
}

export function isOsMicrophonePermissionDenied(state: OsMicrophonePermissionState): boolean {
  return state === "denied" || state === "blocked";
}

/**
 * Query OS / browser microphone permission without opening a stream.
 * Never infer permission state from getUserMedia failure alone.
 */
export async function queryOsMicrophonePermissionState(): Promise<OsMicrophonePermissionState> {
  const bridge = getAndroidMicrophoneBridge();
  if (bridge?.getPermissionStatus) {
    const status = normalizeAndroidMicrophoneStatus(bridge.getPermissionStatus());
    logMicrophonePermission("OS permission query (android native)", status);
    if (status === "granted") return "granted";
    if (status === "blocked") return "blocked";
    if (status === "denied") return "denied";
    if (status === "prompt") return "prompt";
  }

  if (isCapacitorIosNative()) {
    try {
      const { status } = await MicPermissionCapacitor.getMicrophoneStatus();
      logMicrophonePermission("OS permission query (capacitor ios)", status);
      if (status === "granted") return "granted";
      if (status === "denied") return "denied";
    } catch {
      /* plugin missing */
    }
  }

  if (typeof navigator !== "undefined" && navigator.permissions) {
    try {
      const status = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });
      logMicrophonePermission("OS permission query (permissions API)", status.state);
      if (status.state === "granted") return "granted";
      if (status.state === "denied") return "denied";
      if (status.state === "prompt") return "prompt";
    } catch {
      /* Permissions API unsupported */
    }
  }

  return "unknown";
}

function mapRuntimeFailureCode(errorName: string, errorMessage: string): MicrophoneRuntimeErrorCode {
  const lower = errorMessage.toLowerCase();
  if (
    errorName === "NotReadableError" ||
    lower.includes("could not start audio source") ||
    lower.includes("busy")
  ) {
    return "microphone_busy";
  }
  if (errorName === "AbortError" || lower.includes("aborted")) {
    return "stale_stream";
  }
  if (errorName === "InvalidStateError" || lower.includes("state")) {
    return "dead_recorder";
  }
  if (errorName === "SecurityError") {
    return "security_error";
  }
  return "recognition_start_failed";
}

/**
 * Classify a getUserMedia / recording failure using OS permission truth first.
 * getUserMedia failure alone must never imply permission denied.
 */
export async function classifyMicrophoneFailure(err: unknown): Promise<MicrophoneFailureClassification> {
  const errorName = domErrorName(err);
  const errorMessage = domErrorMessage(err);
  const osPermissionState = await queryOsMicrophonePermissionState();

  const looksLikePermissionError =
    errorName === "NotAllowedError" ||
    errorName === "PermissionDeniedError" ||
    errorMessage.toLowerCase().includes("permission denied");

  let mappedCode: MicrophoneRuntimeErrorCode;
  let isTruePermissionDenial = false;

  if (looksLikePermissionError) {
    if (isOsMicrophonePermissionDenied(osPermissionState)) {
      mappedCode = osPermissionState === "blocked" ? "microphone_blocked" : "microphone_denied";
      isTruePermissionDenial = true;
    } else if (osPermissionState === "granted") {
      mappedCode = mapRuntimeFailureCode(errorName, errorMessage);
      if (mappedCode === "recognition_start_failed") mappedCode = "microphone_busy";
    } else {
      mappedCode = "recognition_start_failed";
    }
  } else {
    mappedCode = mapRuntimeFailureCode(errorName, errorMessage);
  }

  logMicrophonePermission("classified microphone failure", {
    osPermissionState,
    errorName,
    errorMessage,
    isTruePermissionDenial,
    mappedCode,
  });

  return { osPermissionState, errorName, errorMessage, isTruePermissionDenial, mappedCode };
}

function statusToAccessResult(status: AndroidMicrophoneStatus): MicrophoneAccessResult {
  if (status === "granted") return { granted: true };
  if (status === "blocked") return { granted: false, reason: "blocked" };
  if (status === "unavailable") return { granted: false, reason: "unavailable" };
  return { granted: false, reason: "denied" };
}

async function requestAndroidNativeMicrophoneAccess(): Promise<MicrophoneAccessResult | null> {
  const bridge = getAndroidMicrophoneBridge();
  if (!bridge?.getPermissionStatus || !bridge.requestPermission) return null;

  if (nativeMicRequest) return nativeMicRequest;
  if (typeof window === "undefined") return { granted: false, reason: "unavailable" };

  nativeMicRequest = new Promise<MicrophoneAccessResult>((resolve) => {
    const before = normalizeAndroidMicrophoneStatus(bridge.getPermissionStatus?.());
    logMicrophonePermission("android native status before request", before);
    if (before === "granted" || before === "blocked" || before === "unavailable") {
      resolve(statusToAccessResult(before));
      return;
    }

    const callbackId = `mic_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    let timeoutId: number | null = null;
    const finish = (status: AndroidMicrophoneStatus) => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.removeEventListener("amynest-microphone-permission-result", onResult);
      logMicrophonePermission("android native request result", status);
      resolve(statusToAccessResult(status));
    };
    const onResult = (event: Event) => {
      const detail = (event as CustomEvent<{ callbackId?: string; status?: string }>).detail;
      if (!detail || detail.callbackId !== callbackId) return;
      finish(normalizeAndroidMicrophoneStatus(detail.status));
    };

    window.addEventListener("amynest-microphone-permission-result", onResult);
    const launched = normalizeAndroidMicrophoneStatus(bridge.requestPermission?.(callbackId));
    logMicrophonePermission("android native request launch", { callbackId, launched });

    if (launched !== "requested") {
      window.removeEventListener("amynest-microphone-permission-result", onResult);
      resolve(statusToAccessResult(launched === "busy" ? before : launched));
      return;
    }

    timeoutId = window.setTimeout(() => {
      const latest = normalizeAndroidMicrophoneStatus(bridge.getPermissionStatus?.());
      logMicrophonePermission("android native request timeout; using latest status", latest);
      finish(latest);
    }, 30_000);
  }).finally(() => {
    nativeMicRequest = null;
  });

  return nativeMicRequest;
}

export function openAndroidMicrophoneSettings(): boolean {
  const bridge = getAndroidMicrophoneBridge();
  if (!bridge?.openSettings) return false;
  logMicrophonePermission("opening android app settings");
  bridge.openSettings();
  return true;
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
  nativeMicRequest = null;
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
  /** Caller opens getUserMedia immediately — skip throwaway probe to avoid dead streams. */
  skipProbeStream?: boolean;
}): Promise<MicrophoneAccessResult> {
  const forFeature = options?.forFeature ?? false;
  const skipProbeStream = options?.skipProbeStream ?? false;
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

    if (isAndroidWebViewWrapper()) {
      const native = await requestAndroidNativeMicrophoneAccess();
      if (native) {
        if (native.granted) cache = "granted";
        else cache = "unknown";
        return native;
      }
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

    if (skipProbeStream) {
      const osState = await queryOsMicrophonePermissionState();
      logMicrophonePermission("skipProbeStream — deferring stream open to caller", { osState });
      if (isOsMicrophonePermissionDenied(osState)) {
        return { granted: false, reason: osState === "blocked" ? "blocked" : "denied" };
      }
      return { granted: true };
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
      logMicrophonePermission("requesting getUserMedia permission probe", { forFeature });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      cache = "granted";
      logMicrophonePermission("getUserMedia permission probe granted");
      return { granted: true };
    } catch (err) {
      const errorName = domErrorName(err);
      const osPermissionState = await queryOsMicrophonePermissionState();
      logMicrophonePermission("getUserMedia permission probe failed", {
        errorName,
        osPermissionState,
        err,
      });

      if (osPermissionState === "granted") {
        cache = "granted";
        return { granted: true };
      }

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
      if (osPermissionState === "blocked") return { granted: false, reason: "blocked" };
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
    logMicrophonePermission("openMicrophoneStream blocked before stream open", access.reason);
    return { ok: false, reason: access.reason };
  }

  try {
    logMicrophonePermission("opening microphone stream");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    cache = "granted";
    logMicrophonePermission("microphone stream opened", {
      tracks: stream.getAudioTracks().length,
    });
    return { ok: true, stream };
  } catch (err) {
    const errorName = domErrorName(err);
    const osPermissionState = await queryOsMicrophonePermissionState();
    logMicrophonePermission("microphone stream open failed", {
      errorName,
      osPermissionState,
      err,
    });
    resetMicrophonePermissionCache();
    if (isOsMicrophonePermissionDenied(osPermissionState)) {
      return { ok: false, reason: osPermissionState === "blocked" ? "blocked" : "denied" };
    }
    return { ok: false, reason: "unavailable" };
  }
}
