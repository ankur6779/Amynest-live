/** Client-side guard before Firebase sendEmailVerification (Firebase has its own throttling). */

export const MAX_VERIFICATION_SEND_ATTEMPTS = 5;
export const BLOCK_AFTER_LIMIT_MS = 60_000;
export const UX_COOLDOWN_MS = 30_000;

export type VerificationRateStatus = {
  canSend: boolean;
  attempts: number;
  blockedUntil: number | null;
  uxCooldownSeconds: number;
};

type RateState = {
  attempts: number;
  blockedUntil: number | null;
  lastSentAt: number | null;
};

const RATE_KEY = (uid: string) => `amynest_verify_rate:${uid}`;
const INFLIGHT_KEY = (uid: string) => `amynest_verify_inflight:${uid}`;

const EMPTY_STATE: RateState = { attempts: 0, blockedUntil: null, lastSentAt: null };

function readState(uid: string): RateState {
  if (typeof window === "undefined") return { ...EMPTY_STATE };
  try {
    const raw = sessionStorage.getItem(RATE_KEY(uid));
    if (!raw) return { ...EMPTY_STATE };
    const parsed = JSON.parse(raw) as RateState;
    return {
      attempts: typeof parsed.attempts === "number" ? parsed.attempts : 0,
      blockedUntil: typeof parsed.blockedUntil === "number" ? parsed.blockedUntil : null,
      lastSentAt: typeof parsed.lastSentAt === "number" ? parsed.lastSentAt : null,
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

function writeState(uid: string, state: RateState): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(RATE_KEY(uid), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/** Clear block + attempts (e.g. after successful email verification). */
export function resetVerificationRateLimit(uid: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(RATE_KEY(uid));
    sessionStorage.removeItem(INFLIGHT_KEY(uid));
  } catch {
    /* ignore */
  }
}

export function getVerificationRateStatus(uid: string, now = Date.now()): VerificationRateStatus {
  let state = readState(uid);

  if (state.blockedUntil != null && now >= state.blockedUntil) {
    state = { attempts: 0, blockedUntil: null, lastSentAt: state.lastSentAt };
    writeState(uid, state);
  }

  const uxCooldownSeconds =
    state.lastSentAt != null
      ? Math.max(0, Math.ceil((UX_COOLDOWN_MS - (now - state.lastSentAt)) / 1000))
      : 0;

  if (state.blockedUntil != null && now < state.blockedUntil) {
    return {
      canSend: false,
      attempts: state.attempts,
      blockedUntil: state.blockedUntil,
      uxCooldownSeconds,
    };
  }

  return {
    canSend: state.attempts < MAX_VERIFICATION_SEND_ATTEMPTS,
    attempts: state.attempts,
    blockedUntil: null,
    uxCooldownSeconds,
  };
}

export function recordVerificationSendSuccess(uid: string, now = Date.now()): VerificationRateStatus {
  const state = readState(uid);
  const attempts = state.attempts + 1;
  const blockedUntil =
    attempts >= MAX_VERIFICATION_SEND_ATTEMPTS ? now + BLOCK_AFTER_LIMIT_MS : null;
  writeState(uid, { attempts, blockedUntil, lastSentAt: now });
  return getVerificationRateStatus(uid, now);
}

export function isVerificationSendInflight(uid: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(INFLIGHT_KEY(uid)) === "1";
  } catch {
    return false;
  }
}

export function setVerificationSendInflight(uid: string, inflight: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (inflight) sessionStorage.setItem(INFLIGHT_KEY(uid), "1");
    else sessionStorage.removeItem(INFLIGHT_KEY(uid));
  } catch {
    /* ignore */
  }
}

export class VerificationRateLimitError extends Error {
  readonly blockedUntil: number;

  constructor(blockedUntil: number) {
    super("verification_rate_limited");
    this.name = "VerificationRateLimitError";
    this.blockedUntil = blockedUntil;
  }
}
