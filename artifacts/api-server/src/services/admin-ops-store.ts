/**
 * Admin quick-action overrides — in-memory ops flags for live incident response.
 * Self-healing controller writes here with adminUserId "self-heal".
 */

export type AdminOpsState = {
  disableStreaming: boolean;
  disableApi: boolean;
  forceEmergencyMode: boolean;
  safeMode: boolean;
  pregenerationPaused: boolean;
  reduceDbReads: boolean;
  cacheDisabled: boolean;
  selfHealEnabled: boolean;
  cacheClearedAt: number | null;
  updatedAt: number;
  updatedBy: string | null;
};

/** Client-facing control panel toggles (derived, not stored separately). */
export type AdminOpsControlPanel = AdminOpsState & {
  streamingEnabled: boolean;
  apiEnabled: boolean;
  cacheEnabled: boolean;
};

const SELF_HEAL_ACTOR = "self-heal";
const MANUAL_LOCK_MS = 15 * 60 * 1000;

let state: AdminOpsState = {
  disableStreaming: false,
  disableApi: false,
  forceEmergencyMode: false,
  safeMode: false,
  pregenerationPaused: false,
  reduceDbReads: false,
  cacheDisabled: false,
  selfHealEnabled: true,
  cacheClearedAt: null,
  updatedAt: Date.now(),
  updatedBy: null,
};

let manualOpsLockUntil = 0;

export type AdminOpsAction =
  | "disable_streaming"
  | "enable_streaming"
  | "disable_api"
  | "enable_api"
  | "clear_cache"
  | "force_emergency"
  | "reset_emergency"
  | "reset_all"
  | "enable_safe_mode"
  | "disable_safe_mode"
  | "enable_self_heal"
  | "disable_self_heal";

export function getAdminOpsState(): AdminOpsState {
  return { ...state };
}

export function getAdminOpsControlPanel(): AdminOpsControlPanel {
  const ops = getAdminOpsState();
  return {
    ...ops,
    streamingEnabled: !ops.disableStreaming,
    apiEnabled: !ops.disableApi,
    cacheEnabled: !ops.cacheDisabled,
  };
}

/** Minimal ops flags exposed to all authenticated clients (no admin internals). */
export function getClientAudioOpsFlags(): {
  disableStreaming: boolean;
  disableApi: boolean;
  forceEmergencyMode: boolean;
  safeMode: boolean;
  pregenerationPaused: boolean;
  reduceDbReads: boolean;
  cacheDisabled: boolean;
  selfHealEnabled: boolean;
  streamingEnabled: boolean;
  apiEnabled: boolean;
  cacheEnabled: boolean;
  degradedMode: boolean;
  apiUsageFactor: number;
  streamingWeightFactor: number;
  prefetchDepth: number;
  cacheClearedAt: number | null;
  updatedAt: number;
} {
  const ops = getAdminOpsControlPanel();
  return {
    disableStreaming: ops.disableStreaming,
    disableApi: ops.disableApi,
    forceEmergencyMode: ops.forceEmergencyMode,
    safeMode: ops.safeMode,
    pregenerationPaused: ops.pregenerationPaused,
    reduceDbReads: ops.reduceDbReads,
    cacheDisabled: ops.cacheDisabled,
    selfHealEnabled: ops.selfHealEnabled,
    streamingEnabled: ops.streamingEnabled,
    apiEnabled: ops.apiEnabled,
    cacheEnabled: ops.cacheEnabled,
    degradedMode: false,
    apiUsageFactor: 1,
    streamingWeightFactor: 1,
    prefetchDepth: 1,
    cacheClearedAt: ops.cacheClearedAt,
    updatedAt: ops.updatedAt,
  };
}

export function isCacheDisabled(): boolean {
  return state.cacheDisabled;
}

export function isSelfHealManualLockActive(now = Date.now()): boolean {
  return now < manualOpsLockUntil;
}

export function isPregenerationPaused(): boolean {
  return state.pregenerationPaused;
}

export function shouldReduceDbReads(): boolean {
  return state.reduceDbReads;
}

export function isSafeModeActive(): boolean {
  return state.safeMode;
}

/** Never leave all audio layers disabled — emergency/static must remain. */
export function ensureMinimumAudioPath(): void {
  if (state.disableApi && state.disableStreaming && state.cacheDisabled) {
    state.forceEmergencyMode = true;
    state.cacheDisabled = false;
    state.updatedAt = Date.now();
    state.updatedBy = SELF_HEAL_ACTOR;
  }
}

function applySafeMode(enabled: boolean): void {
  state.safeMode = enabled;
  if (enabled) {
    state.disableStreaming = true;
    state.disableApi = true;
    state.forceEmergencyMode = true;
  }
}

export function applyAdminOpsAction(
  action: AdminOpsAction,
  adminUserId: string,
): AdminOpsState {
  const now = Date.now();
  const fromSelfHeal = adminUserId === SELF_HEAL_ACTOR;

  if (fromSelfHeal && !state.selfHealEnabled) {
    return getAdminOpsState();
  }
  if (fromSelfHeal && isSelfHealManualLockActive(now)) {
    return getAdminOpsState();
  }

  switch (action) {
    case "disable_streaming":
      state.disableStreaming = true;
      break;
    case "enable_streaming":
      state.disableStreaming = false;
      if (!state.disableApi && !state.forceEmergencyMode) {
        state.safeMode = false;
      }
      break;
    case "disable_api":
      state.disableApi = true;
      break;
    case "enable_api":
      state.disableApi = false;
      if (!state.disableStreaming && !state.forceEmergencyMode) {
        state.safeMode = false;
      }
      break;
    case "clear_cache":
      state.cacheClearedAt = now;
      break;
    case "force_emergency":
      state.forceEmergencyMode = true;
      break;
    case "reset_emergency":
      state.forceEmergencyMode = false;
      if (!state.disableStreaming && !state.disableApi) {
        state.safeMode = false;
      }
      break;
    case "enable_safe_mode":
      applySafeMode(true);
      break;
    case "disable_safe_mode":
      applySafeMode(false);
      state.disableStreaming = false;
      state.disableApi = false;
      state.forceEmergencyMode = false;
      break;
    case "enable_self_heal":
      state.selfHealEnabled = true;
      break;
    case "disable_self_heal":
      state.selfHealEnabled = false;
      break;
    case "reset_all":
      state = {
        disableStreaming: false,
        disableApi: false,
        forceEmergencyMode: false,
        safeMode: false,
        pregenerationPaused: false,
        reduceDbReads: false,
        cacheDisabled: false,
        selfHealEnabled: state.selfHealEnabled,
        cacheClearedAt: state.cacheClearedAt,
        updatedAt: now,
        updatedBy: adminUserId,
      };
      return getAdminOpsState();
  }

  if (!fromSelfHeal) {
    manualOpsLockUntil = now + MANUAL_LOCK_MS;
  }

  state.updatedAt = now;
  state.updatedBy = adminUserId;
  ensureMinimumAudioPath();
  return getAdminOpsState();
}

/** Self-healing controller — bypasses manual lock for infra flags only. */
export function applySelfHealInfraFlag(
  flag: "pregenerationPaused" | "reduceDbReads" | "cacheDisabled",
  value: boolean,
): void {
  if (!state.selfHealEnabled) return;
  if (flag === "pregenerationPaused") {
    state.pregenerationPaused = value;
  } else if (flag === "reduceDbReads") {
    state.reduceDbReads = value;
  } else {
    state.cacheDisabled = value;
  }
  state.updatedAt = Date.now();
  state.updatedBy = SELF_HEAL_ACTOR;
  ensureMinimumAudioPath();
}

export function getSelfHealActorId(): string {
  return SELF_HEAL_ACTOR;
}

/** Test-only reset. */
export function resetAdminOpsStoreForTests(): void {
  state = {
    disableStreaming: false,
    disableApi: false,
    forceEmergencyMode: false,
    safeMode: false,
    pregenerationPaused: false,
    reduceDbReads: false,
    cacheDisabled: false,
    selfHealEnabled: true,
    cacheClearedAt: null,
    updatedAt: Date.now(),
    updatedBy: null,
  };
  manualOpsLockUntil = 0;
}
