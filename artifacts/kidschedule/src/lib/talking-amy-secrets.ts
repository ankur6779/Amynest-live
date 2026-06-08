/**
 * Secret Amy events — 5% post-playback trigger, 5-minute device-local overlay.
 */

import {
  TALKING_AMY_SECRET_MODES,
  type TalkingAmySecretModeId,
} from "@/lib/talking-amy-modes";

const SECRET_STATE_KEY = "talking_amy_secret_v1";

export const SECRET_TRIGGER_CHANCE = 0.05;
export const SECRET_DURATION_MS = 5 * 60 * 1000;

type SecretState = {
  modeId: TalkingAmySecretModeId;
  expiresAt: number;
};

function readJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isSecretId(value: string): value is TalkingAmySecretModeId {
  return TALKING_AMY_SECRET_MODES.some((m) => m.id === value);
}

function loadSecretState(): SecretState | null {
  if (typeof window === "undefined") return null;
  const parsed = readJson<Partial<SecretState>>(window.localStorage.getItem(SECRET_STATE_KEY), {});
  if (!parsed.modeId || !isSecretId(parsed.modeId)) return null;
  if (!Number.isFinite(parsed.expiresAt) || (parsed.expiresAt as number) <= Date.now()) {
    clearActiveSecretMode();
    return null;
  }
  return { modeId: parsed.modeId, expiresAt: parsed.expiresAt as number };
}

function saveSecretState(state: SecretState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SECRET_STATE_KEY, JSON.stringify(state));
}

export function clearActiveSecretMode(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SECRET_STATE_KEY);
}

export function getActiveSecretModeId(now = Date.now()): TalkingAmySecretModeId | null {
  const state = loadSecretState();
  if (!state) return null;
  if (state.expiresAt <= now) {
    clearActiveSecretMode();
    return null;
  }
  return state.modeId;
}

export function getSecretModeRemainingMs(now = Date.now()): number {
  const state = loadSecretState();
  if (!state) return 0;
  return Math.max(0, state.expiresAt - now);
}

export function isSecretModeActive(now = Date.now()): boolean {
  return getActiveSecretModeId(now) != null;
}

function pickRandomSecretMode(): TalkingAmySecretModeId {
  const ids = TALKING_AMY_SECRET_MODES.map((m) => m.id) as TalkingAmySecretModeId[];
  return ids[Math.floor(Math.random() * ids.length)] ?? "rainbow";
}

/**
 * Roll after successful playback — returns newly activated secret id or null.
 */
export function tryTriggerSecretMode(
  roll = Math.random(),
  now = Date.now(),
): TalkingAmySecretModeId | null {
  if (roll >= SECRET_TRIGGER_CHANCE) return null;
  if (getActiveSecretModeId(now)) return null;

  const modeId = pickRandomSecretMode();
  saveSecretState({ modeId, expiresAt: now + SECRET_DURATION_MS });
  return modeId;
}

export function activateSecretMode(
  modeId: TalkingAmySecretModeId,
  now = Date.now(),
): void {
  saveSecretState({ modeId, expiresAt: now + SECRET_DURATION_MS });
}
