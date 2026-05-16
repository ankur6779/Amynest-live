import { registerPlugin } from "@capacitor/core";

/** Matches `MicPermissionPlugin.swift` (`jsName = "MicPermission"`). */
export type MicNativeStatus = "granted" | "denied" | "undetermined" | "unknown";

interface MicPermissionPlugin {
  getMicrophoneStatus(): Promise<{ status: MicNativeStatus }>;
  requestMicrophonePermission(): Promise<{ status: MicNativeStatus }>;
  openAppSettings(): Promise<void>;
}

export const MicPermissionCapacitor = registerPlugin<MicPermissionPlugin>(
  "MicPermission",
  {
    web: {
      getMicrophoneStatus: async () => ({ status: "unknown" as const }),
      requestMicrophonePermission: async () => ({ status: "unknown" as const }),
      openAppSettings: async () => undefined,
    },
    android: {
      getMicrophoneStatus: async () => ({ status: "unknown" as const }),
      requestMicrophonePermission: async () => ({ status: "unknown" as const }),
      openAppSettings: async () => undefined,
    },
  },
);

/** Mic row state for the startup gate — aligns with iOS Settings, not Permissions API. */
export async function getIosNativeMicrophoneGateState(): Promise<
  "granted" | "denied" | "prompt" | "unknown"
> {
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
