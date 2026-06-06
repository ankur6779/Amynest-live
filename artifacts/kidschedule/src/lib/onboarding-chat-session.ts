import {
  chatMessage,
  createChatMessageId,
  type ChatMessage,
  type OnboardingStep,
} from "@/lib/onboarding-chat-types";
import { trackOnboardingError } from "@/lib/onboarding-analytics";

/** Bump when persisted shape changes — mismatched versions are cleared on restore. */
export const CURRENT_ONBOARDING_SESSION_VERSION = 5 as const;

const STORAGE_KEY = "amynest_onboarding_session";
/** Legacy key — migrated once, then removed. */
const LEGACY_STORAGE_KEY = "amynest_onboarding_chat_v1";

const MAX_MESSAGES = 120;
const MAX_SESSION_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const RESUMABLE_STEPS = new Set<OnboardingStep>([
  "intro",
  "country-confirm",
  "child-name",
  "child-dob",
  "child-birthday",
  "infant-feeding",
  "infant-sleep",
  "child-education-stage",
  "child-class-grade",
  "child-schedule-known",
  "child-school-start",
  "child-school-end",
  "child-school-days",
  "child-wake",
  "child-sleep",
  "parent-name",
  "parent-role",
  "parent-work",
  "parent-region",
  "parent-diet",
  "parent-goals",
  "parent-allergies",
]);

export interface OnboardingSessionData {
  messages: ChatMessage[];
  textInput: string;
  countryCode: string;
  countryName: string;
  curr: Record<string, unknown>;
  parent: Record<string, unknown>;
  children: Record<string, unknown>[];
}

export interface OnboardingChatSession {
  version: typeof CURRENT_ONBOARDING_SESSION_VERSION;
  timestamp: number;
  step: OnboardingStep;
  data: OnboardingSessionData;
}

/** @deprecated use CURRENT_ONBOARDING_SESSION_VERSION */
export const ONBOARDING_CHAT_SESSION_VERSION = CURRENT_ONBOARDING_SESSION_VERSION;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.slice(0, maxLen);
}

function sanitizeMessage(raw: unknown): ChatMessage | null {
  if (!isRecord(raw)) return null;
  const role = raw.role === "amy" || raw.role === "user" ? raw.role : null;
  const text = sanitizeText(raw.text, 4000);
  if (!role || !text.trim()) return null;
  const id =
    typeof raw.id === "string" && raw.id.length > 0
      ? raw.id.slice(0, 80)
      : createChatMessageId();
  return chatMessage(role, text, id);
}

function sanitizeStep(raw: unknown): OnboardingStep {
  if (raw === "add-more") return "parent-name";
  if (typeof raw !== "string" || !RESUMABLE_STEPS.has(raw as OnboardingStep)) {
    return "child-name";
  }
  return raw as OnboardingStep;
}

function sanitizeSessionData(raw: unknown): OnboardingSessionData {
  const parsed = isRecord(raw) ? raw : {};
  const messages = (Array.isArray(parsed.messages) ? parsed.messages : [])
    .map(sanitizeMessage)
    .filter((m): m is ChatMessage => m != null)
    .slice(-MAX_MESSAGES);

  return {
    messages,
    textInput: sanitizeText(parsed.textInput, 500),
    countryCode: sanitizeText(parsed.countryCode, 8),
    countryName: sanitizeText(parsed.countryName, 120),
    curr: isRecord(parsed.curr) ? parsed.curr : {},
    parent: isRecord(parsed.parent) ? parsed.parent : {},
    children: Array.isArray(parsed.children)
      ? parsed.children.filter(isRecord).slice(0, 12)
      : [],
  };
}

function parseV2Session(parsed: Record<string, unknown>): OnboardingChatSession | null {
  if (parsed.version !== CURRENT_ONBOARDING_SESSION_VERSION) return null;

  const timestamp =
    typeof parsed.timestamp === "number" && Number.isFinite(parsed.timestamp)
      ? parsed.timestamp
      : Date.now();

  if (Date.now() - timestamp > MAX_SESSION_AGE_MS) return null;

  const dataSource = isRecord(parsed.data) ? parsed.data : parsed;

  return {
    version: CURRENT_ONBOARDING_SESSION_VERSION,
    timestamp,
    step: sanitizeStep(parsed.step),
    data: sanitizeSessionData(dataSource),
  };
}

function migrateLegacyV1(parsed: Record<string, unknown>): OnboardingChatSession | null {
  const version = parsed.version;
  if (version !== 1 && version !== "1") return null;

  const savedAt =
    typeof parsed.savedAt === "number" && Number.isFinite(parsed.savedAt)
      ? parsed.savedAt
      : Date.now();

  if (Date.now() - savedAt > MAX_SESSION_AGE_MS) return null;

  return {
    version: CURRENT_ONBOARDING_SESSION_VERSION,
    timestamp: savedAt,
    step: sanitizeStep(parsed.step),
    data: sanitizeSessionData(parsed),
  };
}

function reportRestoreFailure(reason: string, extra?: Record<string, unknown>): void {
  trackOnboardingError("onboarding_restore_failed", { reason, ...extra });
}

export function loadOnboardingChatSession(): OnboardingChatSession | null {
  if (typeof window === "undefined") return null;
  try {
    if (localStorage.getItem("onboardingComplete") === "true") {
      clearOnboardingChatSession();
      return null;
    }

    const rawCurrent = localStorage.getItem(STORAGE_KEY);
    if (rawCurrent) {
      const parsed = JSON.parse(rawCurrent) as unknown;
      if (isRecord(parsed)) {
        const session = parseV2Session(parsed);
        if (session) return session;
        if (parsed.version !== CURRENT_ONBOARDING_SESSION_VERSION) {
          reportRestoreFailure("version_mismatch", {
            storedVersion: parsed.version,
            expectedVersion: CURRENT_ONBOARDING_SESSION_VERSION,
          });
        } else if (
          typeof parsed.timestamp === "number" &&
          Number.isFinite(parsed.timestamp) &&
          Date.now() - parsed.timestamp > MAX_SESSION_AGE_MS
        ) {
          reportRestoreFailure("session_expired", { storedAt: parsed.timestamp });
        } else {
          reportRestoreFailure("invalid_session");
        }
        clearOnboardingChatSession();
        return null;
      }
      reportRestoreFailure("invalid_session_shape");
      clearOnboardingChatSession();
      return null;
    }

    const rawLegacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawLegacy) {
      const parsed = JSON.parse(rawLegacy) as unknown;
      if (isRecord(parsed)) {
        const migrated = migrateLegacyV1(parsed);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        if (migrated) {
          saveOnboardingChatSession({
            step: migrated.step,
            ...migrated.data,
          });
          return migrated;
        }
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }

    return null;
  } catch (err) {
    reportRestoreFailure("parse_error", {
      message: err instanceof Error ? err.message : "unknown",
    });
    clearOnboardingChatSession();
    return null;
  }
}

export function saveOnboardingChatSession(
  session: OnboardingSessionData & { step: OnboardingStep },
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: OnboardingChatSession = {
      version: CURRENT_ONBOARDING_SESSION_VERSION,
      timestamp: Date.now(),
      step: sanitizeStep(session.step),
      data: sanitizeSessionData(session),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* quota / private mode */
  }
}

export function clearOnboardingChatSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Test helper — simulate an incompatible future session version. */
export function saveIncompatibleOnboardingSessionForTests(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: 999, timestamp: Date.now(), step: "intro", data: {} }),
  );
}
