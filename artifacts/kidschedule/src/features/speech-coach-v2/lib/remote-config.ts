import { parseApiJson } from "@/lib/safe-json-response";
import { getApiUrl } from "@/lib/api";

export interface SpeechCoachV2RemoteConfig {
  speechCoachV2Enabled: boolean;
  speechCoachLegacyVisible: boolean;
}

function envBool(key: string, defaultValue: boolean): boolean {
  const raw = (import.meta.env[key] as string | undefined)?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return defaultValue;
}

const DEFAULT_CONFIG: SpeechCoachV2RemoteConfig = {
  speechCoachV2Enabled: envBool("VITE_SPEECH_COACH_V2_ENABLED", false),
  speechCoachLegacyVisible: envBool("VITE_SPEECH_COACH_LEGACY_VISIBLE", false),
};

let cachedConfig: SpeechCoachV2RemoteConfig = { ...DEFAULT_CONFIG };
const listeners = new Set<() => void>();
const POLL_INTERVAL_MS = 5 * 60 * 1000;
let pollTimer: ReturnType<typeof setInterval> | null = null;

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

export function getSpeechCoachV2RemoteConfig(): SpeechCoachV2RemoteConfig {
  return cachedConfig;
}

export function isSpeechCoachV2Enabled(): boolean {
  return cachedConfig.speechCoachV2Enabled;
}

export function subscribeSpeechCoachV2RemoteConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshSpeechCoachV2RemoteConfig(): Promise<SpeechCoachV2RemoteConfig> {
  try {
    const res = await fetch(getApiUrl("/api/remote-config/speech-coach-v2"), {
      cache: "no-store",
    });
    if (!res.ok) return cachedConfig;
    const data = await parseApiJson<Partial<SpeechCoachV2RemoteConfig>>(res);
    cachedConfig = {
      speechCoachV2Enabled:
        data.speechCoachV2Enabled ?? DEFAULT_CONFIG.speechCoachV2Enabled,
      speechCoachLegacyVisible:
        data.speechCoachLegacyVisible ?? DEFAULT_CONFIG.speechCoachLegacyVisible,
    };
    notifyListeners();
    return cachedConfig;
  } catch {
    return cachedConfig;
  }
}

export function startSpeechCoachV2RemoteConfigPolling(): () => void {
  if (pollTimer) return () => undefined;
  void refreshSpeechCoachV2RemoteConfig();
  pollTimer = setInterval(() => {
    void refreshSpeechCoachV2RemoteConfig();
  }, POLL_INTERVAL_MS);
  return () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
}
