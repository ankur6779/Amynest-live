import {
  AB_VARIANT_KEY,
  ATTRIBUTION_KEY,
  ATTRIBUTION_WINDOW_MS,
  CAMPAIGN_CHECKSUM_KEY,
  CAMPAIGN_STORAGE_KEY,
  FIRST_OPEN_KEY,
  SIGNUP_FLOW_KEY,
  type AbVariant,
  type PreSignupAttribution,
  type PreSignupCampaignState,
  type ScheduledNotif,
} from "./types";
import { buildScheduleFingerprint } from "./schedule";

function safeRead(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function computeCampaignChecksum(state: Omit<PreSignupCampaignState, "checksum">): string {
  const fp = buildScheduleFingerprint(state.scheduled);
  return `${state.variant}:${state.installAtMs}:${fp}`.slice(0, 120);
}

function validateCampaignState(state: PreSignupCampaignState): PreSignupCampaignState | null {
  if (state.version !== 2) return null;
  if (!state.variant || !state.installAtMs || !Array.isArray(state.scheduled)) return null;
  if (state.checksum && state.checksum !== computeCampaignChecksum(state)) {
    return null;
  }
  return state;
}

export function readCampaignState(): PreSignupCampaignState | null {
  const raw = safeRead(CAMPAIGN_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PreSignupCampaignState;
    return validateCampaignState(parsed);
  } catch {
    return null;
  }
}

export function writeCampaignState(state: PreSignupCampaignState): void {
  const { checksum: _ignoredChecksum, ...rest } = state;
  const withChecksum: PreSignupCampaignState = {
    ...rest,
    version: 2,
    checksum: computeCampaignChecksum(rest),
  };
  safeWrite(CAMPAIGN_STORAGE_KEY, JSON.stringify(withChecksum));
  safeWrite(CAMPAIGN_CHECKSUM_KEY, withChecksum.checksum ?? "");
}

export function clearCampaignState(): void {
  safeRemove(CAMPAIGN_STORAGE_KEY);
  safeRemove(CAMPAIGN_CHECKSUM_KEY);
}

export function readAbVariant(): AbVariant | null {
  const v = safeRead(AB_VARIANT_KEY);
  return v === "A" || v === "B" || v === "C" ? v : null;
}

export function persistAbVariant(variant: AbVariant): void {
  safeWrite(AB_VARIANT_KEY, variant);
}

export function recordFirstOpenIfNeeded(nowMs = Date.now()): number {
  const existing = safeRead(FIRST_OPEN_KEY);
  if (existing) {
    const parsed = Number(existing);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  safeWrite(FIRST_OPEN_KEY, String(nowMs));
  return nowMs;
}

export function readFirstOpenAtMs(): number | null {
  const raw = safeRead(FIRST_OPEN_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function readInstallAtMs(): number | null {
  try {
    const raw = localStorage.getItem("amynest:review:install_ts");
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function recordPreSignupAttribution(input: {
  notificationId: string;
  milestone?: string;
  variant?: AbVariant;
  tappedAt?: number;
}): void {
  const tappedAt = input.tappedAt ?? Date.now();
  const attribution: PreSignupAttribution = {
    notificationId: input.notificationId,
    milestone: input.milestone,
    variant: input.variant,
    tappedAt,
    expiresAt: tappedAt + ATTRIBUTION_WINDOW_MS,
  };
  safeWrite(ATTRIBUTION_KEY, JSON.stringify(attribution));
}

export function readAttribution(): PreSignupAttribution | null {
  const raw = safeRead(ATTRIBUTION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PreSignupAttribution;
    if (!parsed.notificationId || !parsed.expiresAt) return null;
    if (parsed.expiresAt < Date.now()) {
      safeRemove(ATTRIBUTION_KEY);
      return null;
    }
    if (parsed.tappedAt > Date.now() + 60_000) {
      safeRemove(ATTRIBUTION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function consumeAttribution(): PreSignupAttribution | null {
  const attr = readAttribution();
  if (attr) safeRemove(ATTRIBUTION_KEY);
  return attr;
}

export function peekAttribution(): PreSignupAttribution | null {
  return readAttribution();
}

/** @deprecated use recordPreSignupAttribution */
export function stashAttributionNotificationId(notificationId: string): void {
  recordPreSignupAttribution({ notificationId });
}

/** @deprecated use consumeAttribution */
export function consumeAttributionNotificationId(): string | null {
  return consumeAttribution()?.notificationId ?? null;
}

/** @deprecated use peekAttribution */
export function peekAttributionNotificationId(): string | null {
  return peekAttribution()?.notificationId ?? null;
}

export function markPreSignupSignupFlowActive(): void {
  try {
    sessionStorage.setItem(SIGNUP_FLOW_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function consumePreSignupSignupFlowActive(): boolean {
  try {
    const v = sessionStorage.getItem(SIGNUP_FLOW_KEY);
    sessionStorage.removeItem(SIGNUP_FLOW_KEY);
    return v === "1";
  } catch {
    return false;
  }
}

export function isPreSignupSignupFlowActive(): boolean {
  try {
    return sessionStorage.getItem(SIGNUP_FLOW_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearPermissionDeniedExit(): void {
  const existing = readCampaignState();
  if (existing?.exitReason !== "permission_denied") return;
  writeCampaignState({
    ...existing,
    segment: "PRE_SIGNUP_USER",
    exitReason: undefined,
    completedAtMs: undefined,
  });
}

export function persistScheduledMessages(scheduled: ScheduledNotif[]): void {
  const existing = readCampaignState();
  if (!existing) return;
  writeCampaignState({ ...existing, scheduled });
}
