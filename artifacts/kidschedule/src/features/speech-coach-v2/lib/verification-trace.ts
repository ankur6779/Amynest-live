import { isCapacitorIosNative } from "@/lib/mic-permission-capacitor";
import { isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";

export type VerificationTraceEntry = {
  tag: string;
  ts: number;
  iso: string;
  platform: string;
  detail?: Record<string, unknown>;
};

declare global {
  interface Window {
    __SPEECH_COACH_V2_TRACE__?: VerificationTraceEntry[];
  }
}

export function detectVerificationPlatform(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (isNativeAmyNestAndroidWrapper()) return "android-webview";
  if (isCapacitorIosNative()) return "capacitor-ios";
  if (/AmyNestAndroid/i.test(ua)) return "android-webview";
  if (/iPad|iPhone|iPod/i.test(ua)) return "safari-ios";
  if (/Android/i.test(ua)) return "android-chrome";
  return "desktop-chrome";
}

export function isVerificationTraceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      import.meta.env.DEV
      || window.localStorage.getItem("speech-coach-v2-verify") === "1"
    );
  } catch {
    return import.meta.env.DEV;
  }
}

export function verificationTrace(
  tag: string,
  detail?: Record<string, unknown>,
): VerificationTraceEntry {
  const entry: VerificationTraceEntry = {
    tag,
    ts: Date.now(),
    iso: new Date().toISOString(),
    platform: detectVerificationPlatform(),
    detail,
  };

  if (isVerificationTraceEnabled()) {
    console.info(`[SC2_VERIFY] ${tag}`, entry);
    if (typeof window !== "undefined") {
      window.__SPEECH_COACH_V2_TRACE__ = window.__SPEECH_COACH_V2_TRACE__ ?? [];
      window.__SPEECH_COACH_V2_TRACE__.push(entry);
    }
  }

  return entry;
}

export function getVerificationTrace(): VerificationTraceEntry[] {
  if (typeof window === "undefined") return [];
  return window.__SPEECH_COACH_V2_TRACE__ ?? [];
}

export function clearVerificationTrace(): void {
  if (typeof window !== "undefined") {
    window.__SPEECH_COACH_V2_TRACE__ = [];
  }
}

/** Required connection sequence tags for TEST 2. */
export const CONNECTION_TRACE_TAGS = [
  "MIC_REQUEST_START",
  "MIC_REQUEST_SUCCESS",
  "TOKEN_MINTED",
  "PC_CREATED",
  "MIC_OPENED",
  "SDP_SENT",
  "SDP_ACCEPTED",
  "REMOTE_DESCRIPTION_SET",
  "DATA_CHANNEL_OPEN",
  "ONTRACK_FIRED",
  "AUDIO_PLAY_STARTED",
] as const;

/** Required greeting sequence tags for TEST 3. */
export const GREETING_TRACE_TAGS = [
  "RESPONSE_CREATE_SENT",
  "RESPONSE_CREATED",
  "AUDIO_STARTED",
  "AUDIO_COMPLETED",
] as const;

export function evaluateConnectionTrace(
  trace: VerificationTraceEntry[],
): { pass: boolean; missing: string[]; ordered: VerificationTraceEntry[] } {
  const tags = trace.map((e) => e.tag);
  const missing = CONNECTION_TRACE_TAGS.filter((tag) => !tags.includes(tag));
  const ordered = CONNECTION_TRACE_TAGS.flatMap((tag) =>
    trace.filter((e) => e.tag === tag),
  );
  return { pass: missing.length === 0, missing, ordered };
}
