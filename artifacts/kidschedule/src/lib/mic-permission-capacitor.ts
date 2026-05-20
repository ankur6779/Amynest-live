import { Capacitor, registerPlugin } from "@capacitor/core";

/** Matches `MicPermissionPlugin.swift` (`jsName = "MicPermission"`). */
export type MicNativeStatus = "granted" | "denied" | "undetermined" | "unknown";

interface MicPermissionPlugin {
  getMicrophoneStatus(): Promise<{ status: MicNativeStatus }>;
  requestMicrophonePermission(): Promise<{ status: MicNativeStatus }>;
  prepareAudioSessionForRecording(): Promise<{ ok: boolean }>;
  openAppSettings(): Promise<void>;
}

export const MicPermissionCapacitor = registerPlugin<MicPermissionPlugin>("MicPermission", {
  web: {
    getMicrophoneStatus: async () => ({ status: "unknown" as const }),
    requestMicrophonePermission: async () => ({ status: "unknown" as const }),
    prepareAudioSessionForRecording: async () => ({ ok: false }),
    openAppSettings: async () => undefined,
  },
  android: {
    getMicrophoneStatus: async () => ({ status: "unknown" as const }),
    requestMicrophonePermission: async () => ({ status: "unknown" as const }),
    prepareAudioSessionForRecording: async () => ({ ok: false }),
    openAppSettings: async () => undefined,
  },
});

/** Activates AVAudioSession playAndRecord before WKWebView capture (e.g. after Amy TTS). */
export async function prepareIosAudioSessionForRecording(): Promise<void> {
  if (!isCapacitorIosNative()) return;
  try {
    await MicPermissionCapacitor.prepareAudioSessionForRecording();
  } catch {
    /* plugin missing on old builds */
  }
}

export function isCapacitorIosNative(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
}

/** Mic row state for the startup gate — aligns with iOS Settings, not Permissions API. */
export async function getIosNativeMicrophoneGateState(): Promise<
  "granted" | "denied" | "prompt" | "unknown"
> {
  if (!isCapacitorIosNative()) return "unknown";
  try {
    const { status } = await MicPermissionCapacitor.getMicrophoneStatus();
    if (status === "granted") return "granted";
    if (status === "denied") return "denied";
    if (status === "undetermined") return "prompt";
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Request iOS microphone access via AVAudioSession (native plugin), then
 * getUserMedia so WKWebView and Settings both see mic usage.
 */
export async function requestIosMicrophoneAccess(): Promise<
  "granted" | "denied" | "unknown"
> {
  if (!isCapacitorIosNative()) return "unknown";

  await prepareIosAudioSessionForRecording();

  let nativeStatus: MicNativeStatus = "unknown";
  try {
    const res = await MicPermissionCapacitor.requestMicrophonePermission();
    nativeStatus = res.status;
    if (nativeStatus === "granted") return "granted";
    if (nativeStatus === "denied") return "denied";
  } catch {
    /* plugin missing — fall through to getUserMedia */
  }

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return nativeStatus === "denied" ? "denied" : "unknown";
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch {
    if (nativeStatus === "denied") return "denied";
    try {
      const { status } = await MicPermissionCapacitor.getMicrophoneStatus();
      if (status === "granted") return "granted";
      if (status === "denied") return "denied";
    } catch {
      /* ignore */
    }
    return "denied";
  }
}
