import { parseApiJson } from "@/lib/safe-json-response";
import { getApiUrl } from "@/lib/api";

export interface ChatPlatformRemoteConfig {
  chatPlatformVisibilityProtection: boolean;
  forcePromptVisibilityMode: boolean;
  forcePromptVisibilityModeExpiresAt?: string | null;
  /** Alias returned by API */
  expiresAt?: string | null;
  chatPromptFailureThreshold?: number;
  failuresInWindow?: number;
  forceModeReason?: "none" | "manual" | "telemetry_threshold" | "expired";
}

function envBool(key: string, defaultValue: boolean): boolean {
  const raw = (import.meta.env[key] as string | undefined)?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return defaultValue;
}

const DEFAULT_CONFIG: ChatPlatformRemoteConfig = {
  chatPlatformVisibilityProtection: envBool(
    "VITE_CHAT_PLATFORM_VISIBILITY_PROTECTION",
    true,
  ),
  forcePromptVisibilityMode: false,
};

let cachedConfig: ChatPlatformRemoteConfig = { ...DEFAULT_CONFIG };
const listeners = new Set<() => void>();
const POLL_INTERVAL_MS = 5 * 60 * 1000;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollingStarted = false;

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

/** Returns false when force mode is expired — client ignores stale emergency mode. */
export function isForcePromptVisibilityModeActive(
  config: ChatPlatformRemoteConfig = cachedConfig,
  now = Date.now(),
): boolean {
  if (!config.forcePromptVisibilityMode) return false;
  const expiresAt = config.forcePromptVisibilityModeExpiresAt ?? config.expiresAt;
  if (!expiresAt) return true;
  const expiryMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiryMs)) return true;
  return now <= expiryMs;
}

export function getChatPlatformRemoteConfig(): ChatPlatformRemoteConfig {
  return cachedConfig;
}

export function subscribeChatPlatformRemoteConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshChatPlatformRemoteConfig(): Promise<ChatPlatformRemoteConfig> {
  try {
    const res = await fetch(getApiUrl("/api/remote-config/chat-platform"), {
      cache: "no-store",
    });
    if (!res.ok) return cachedConfig;

    const data = (await parseApiJson<Partial<ChatPlatformRemoteConfig>>(res));
    cachedConfig = {
      chatPlatformVisibilityProtection:
        data.chatPlatformVisibilityProtection ??
        DEFAULT_CONFIG.chatPlatformVisibilityProtection,
      forcePromptVisibilityMode: data.forcePromptVisibilityMode ?? false,
      forcePromptVisibilityModeExpiresAt:
        data.forcePromptVisibilityModeExpiresAt ?? data.expiresAt ?? null,
      expiresAt: data.expiresAt ?? data.forcePromptVisibilityModeExpiresAt ?? null,
      chatPromptFailureThreshold: data.chatPromptFailureThreshold,
      failuresInWindow: data.failuresInWindow,
      forceModeReason: data.forceModeReason,
    };
    notifyListeners();
  } catch {
    /* keep last known config — offline / API unavailable */
  }
  return cachedConfig;
}

/** Poll API on boot, foreground, and every 5 minutes (no APK release required). */
export function startChatPlatformRemoteConfigPolling(): () => void {
  if (pollingStarted || typeof window === "undefined") return () => {};
  pollingStarted = true;

  void refreshChatPlatformRemoteConfig();

  pollTimer = setInterval(() => {
    void refreshChatPlatformRemoteConfig();
  }, POLL_INTERVAL_MS);

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      void refreshChatPlatformRemoteConfig();
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    pollingStarted = false;
    if (pollTimer != null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

/** Test helper */
export function resetChatPlatformRemoteConfigForTests(
  config: ChatPlatformRemoteConfig = { ...DEFAULT_CONFIG },
): void {
  cachedConfig = { ...config };
  notifyListeners();
}
