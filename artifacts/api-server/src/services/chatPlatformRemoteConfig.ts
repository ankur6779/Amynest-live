/**
 * Server-side ChatPlatform remote config + telemetry-driven kill switch.
 * Toggle via Render env vars (no APK / web deploy required for API-only flips).
 *
 * REMOTE_CONFIG_CHAT_PLATFORM_VISIBILITY_PROTECTION=true|false
 * REMOTE_CONFIG_FORCE_PROMPT_VISIBILITY_MODE=true|false  (manual override)
 * REMOTE_CONFIG_FORCE_PROMPT_VISIBILITY_MODE_EXPIRES_AT=2026-06-05T12:00:00Z
 * REMOTE_CONFIG_CHAT_PROMPT_FAILURE_THRESHOLD=5          (auto force per hour)
 */
export interface ChatPlatformRemoteConfigPayload {
  chatPlatformVisibilityProtection: boolean;
  forcePromptVisibilityMode: boolean;
  forcePromptVisibilityModeExpiresAt: string | null;
  /** Alias for client compatibility */
  expiresAt: string | null;
  chatPromptFailureThreshold: number;
  failuresInWindow: number;
  forceModeReason: "none" | "manual" | "telemetry_threshold" | "expired";
}

const FAILURE_WINDOW_MS = 60 * 60 * 1000;
const failureTimestamps: number[] = [];

function envBool(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key]?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return defaultValue;
}

function envInt(key: string, defaultValue: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return defaultValue;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function parseForceModeExpiresAt(): string | null {
  const raw = process.env.REMOTE_CONFIG_FORCE_PROMPT_VISIBILITY_MODE_EXPIRES_AT?.trim();
  if (!raw) return null;
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return null;
  return new Date(ts).toISOString();
}

function isForceModeExpired(expiresAt: string | null, now = Date.now()): boolean {
  if (!expiresAt) return false;
  const ts = Date.parse(expiresAt);
  return Number.isFinite(ts) && now > ts;
}

function pruneFailureWindow(now = Date.now()): number {
  while (failureTimestamps.length > 0 && now - failureTimestamps[0]! > FAILURE_WINDOW_MS) {
    failureTimestamps.shift();
  }
  return failureTimestamps.length;
}

/** Record a client-reported prompt-hidden failure (feeds auto force mode). */
export function recordChatPlatformPromptHiddenFailure(): void {
  failureTimestamps.push(Date.now());
  pruneFailureWindow();
}

export function getChatPlatformRemoteConfig(now = Date.now()): ChatPlatformRemoteConfigPayload {
  const chatPlatformVisibilityProtection = envBool(
    "REMOTE_CONFIG_CHAT_PLATFORM_VISIBILITY_PROTECTION",
    true,
  );
  const manualForceRequested = envBool("REMOTE_CONFIG_FORCE_PROMPT_VISIBILITY_MODE", false);
  const forcePromptVisibilityModeExpiresAt = parseForceModeExpiresAt();
  const manualForceExpired = manualForceRequested && isForceModeExpired(forcePromptVisibilityModeExpiresAt, now);
  const manualForce = manualForceRequested && !manualForceExpired;

  const chatPromptFailureThreshold = envInt(
    "REMOTE_CONFIG_CHAT_PROMPT_FAILURE_THRESHOLD",
    5,
  );
  const failuresInWindow = pruneFailureWindow(now);
  const telemetryForce = failuresInWindow >= chatPromptFailureThreshold;

  let forceModeReason: ChatPlatformRemoteConfigPayload["forceModeReason"] = "none";
  if (manualForceExpired && manualForceRequested) forceModeReason = "expired";
  else if (manualForce) forceModeReason = "manual";
  else if (telemetryForce) forceModeReason = "telemetry_threshold";

  const forcePromptVisibilityMode = manualForce || telemetryForce;

  return {
    chatPlatformVisibilityProtection,
    forcePromptVisibilityMode,
    forcePromptVisibilityModeExpiresAt,
    expiresAt: forcePromptVisibilityModeExpiresAt,
    chatPromptFailureThreshold,
    failuresInWindow,
    forceModeReason,
  };
}

/** Test helper */
export function resetChatPlatformFailureWindowForTests(): void {
  failureTimestamps.length = 0;
}
