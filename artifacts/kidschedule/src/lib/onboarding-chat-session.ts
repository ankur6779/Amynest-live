import {
  chatMessage,
  createChatMessageId,
  type ChatMessage,
  type OnboardingStep,
} from "@/lib/onboarding-chat-types";

/** Bump when persisted shape changes; loaders accept older versions via migrate. */
export const ONBOARDING_CHAT_SESSION_VERSION = 1 as const;
const STORAGE_KEY = "amynest_onboarding_chat_v1";
const MAX_MESSAGES = 120;
const MAX_SESSION_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const RESUMABLE_STEPS = new Set<OnboardingStep>([
  "intro",
  "country-confirm",
  "child-name",
  "child-dob",
  "infant-feeding",
  "infant-sleep",
  "child-school",
  "child-class",
  "child-school-start",
  "child-school-end",
  "child-school-days",
  "child-wake",
  "child-sleep",
  "add-more",
  "parent-name",
  "parent-role",
  "parent-work",
  "parent-region",
  "parent-diet",
  "parent-goals",
  "parent-mobile",
  "parent-allergies",
]);

export interface OnboardingChatSession {
  version: typeof ONBOARDING_CHAT_SESSION_VERSION;
  savedAt: number;
  messages: ChatMessage[];
  step: OnboardingStep;
  textInput: string;
  countryCode: string;
  countryName: string;
  curr: Record<string, unknown>;
  parent: Record<string, unknown>;
  children: Record<string, unknown>[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.slice(0, maxLen);
}

function sanitizeMessage(raw: unknown, index: number): ChatMessage | null {
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
  if (typeof raw !== "string" || !RESUMABLE_STEPS.has(raw as OnboardingStep)) {
    return "child-name";
  }
  return raw as OnboardingStep;
}

function migrateRawSession(parsed: Record<string, unknown>): OnboardingChatSession | null {
  const version = parsed.version;
  if (version !== 1 && version !== "1") return null;

  const savedAt =
    typeof parsed.savedAt === "number" && Number.isFinite(parsed.savedAt)
      ? parsed.savedAt
      : Date.now();

  if (Date.now() - savedAt > MAX_SESSION_AGE_MS) return null;

  const messages = (Array.isArray(parsed.messages) ? parsed.messages : [])
    .map(sanitizeMessage)
    .filter((m): m is ChatMessage => m != null)
    .slice(-MAX_MESSAGES);

  return {
    version: ONBOARDING_CHAT_SESSION_VERSION,
    savedAt,
    messages,
    step: sanitizeStep(parsed.step),
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

export function loadOnboardingChatSession(): OnboardingChatSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;
    const session = migrateRawSession(parsed);
    if (!session) {
      clearOnboardingChatSession();
      return null;
    }
    return session;
  } catch {
    clearOnboardingChatSession();
    return null;
  }
}

export function saveOnboardingChatSession(session: Omit<OnboardingChatSession, "version" | "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const payload: OnboardingChatSession = {
      version: ONBOARDING_CHAT_SESSION_VERSION,
      savedAt: Date.now(),
      messages: session.messages.slice(-MAX_MESSAGES),
      step: sanitizeStep(session.step),
      textInput: sanitizeText(session.textInput, 500),
      countryCode: sanitizeText(session.countryCode, 8),
      countryName: sanitizeText(session.countryName, 120),
      curr: isRecord(session.curr) ? session.curr : {},
      parent: isRecord(session.parent) ? session.parent : {},
      children: Array.isArray(session.children)
        ? session.children.filter(isRecord).slice(0, 12)
        : [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearOnboardingChatSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
