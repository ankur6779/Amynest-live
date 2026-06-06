import { resolveChatScrollBehavior } from "@/lib/chat-scroll-behavior";
import {
  isKeyboardOpen,
  readChatViewportMetrics,
  readMeasuredVisibleBottomPx,
} from "@/lib/chat-platform/viewport";
import { trackChatPlatformEvent } from "@/lib/chat-platform/telemetry";

export const CHAT_PROMPT_ATTR = "data-chat-prompt-id";

export interface ChatVisibilityContext {
  messagesEl: HTMLElement;
  inputBarEl: HTMLElement | null;
  promptId: string | null | undefined;
  surface: string;
  route?: string;
}

export interface ChatVisibilitySnapshot {
  promptVisible: boolean;
  answerVisible: boolean;
  promptOverlapsKeyboard: boolean;
  answerOverlapsKeyboard: boolean;
  scrollLostActivePrompt: boolean;
  keyboardOpen: boolean;
}

export interface EnsureVisibilityResult {
  adjusted: boolean;
  snapshot: ChatVisibilitySnapshot;
}

function findPromptElement(
  messagesEl: HTMLElement,
  promptId: string | null | undefined,
): HTMLElement | null {
  if (promptId) {
    const match = messagesEl.querySelector<HTMLElement>(`[${CHAT_PROMPT_ATTR}="${promptId}"]`);
    if (match) return match;
  }
  const prompts = messagesEl.querySelectorAll<HTMLElement>(`[${CHAT_PROMPT_ATTR}]`);
  return prompts.length > 0 ? prompts[prompts.length - 1]! : null;
}

function readAnswerElement(
  inputBarEl: HTMLElement | null,
  messagesEl?: HTMLElement | null,
): HTMLElement | null {
  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    if (inputBarEl?.contains(active)) return active;
    if (messagesEl?.contains(active)) return active;
    if (active.closest('[data-chat-answer="true"]')) return active;
  }
  if (inputBarEl) {
    return (
      inputBarEl.querySelector<HTMLElement>(
        "input, textarea, select, button, [role='combobox'], [contenteditable='true']",
      ) ?? inputBarEl
    );
  }
  if (messagesEl) {
    return messagesEl.querySelector<HTMLElement>(
      '[data-chat-answer="true"] input, [data-chat-answer="true"] textarea, [data-chat-answer="true"] button',
    );
  }
  return null;
}

function elementFitsAboveKeyboard(
  rect: DOMRect,
  visibleTop: number,
  visibleBottom: number,
): boolean {
  return rect.top >= visibleTop && rect.bottom <= visibleBottom;
}

export function measureChatVisibility(ctx: ChatVisibilityContext): ChatVisibilitySnapshot {
  const metrics = readChatViewportMetrics();
  const keyboardOpen = isKeyboardOpen(metrics);
  const visibleBottom = readMeasuredVisibleBottomPx();
  const messagesRect = ctx.messagesEl.getBoundingClientRect();
  const visibleTop = messagesRect.top;

  const promptEl = findPromptElement(ctx.messagesEl, ctx.promptId);
  const answerEl = readAnswerElement(ctx.inputBarEl, ctx.messagesEl);

  let promptVisible = true;
  let promptOverlapsKeyboard = false;
  let scrollLostActivePrompt = false;

  if (promptEl) {
    const rect = promptEl.getBoundingClientRect();
    promptVisible =
      rect.bottom > visibleTop &&
      rect.top < visibleBottom &&
      rect.bottom <= visibleBottom + 1;
    promptOverlapsKeyboard = keyboardOpen && rect.bottom > visibleBottom;
    scrollLostActivePrompt =
      rect.top < visibleTop || rect.bottom > visibleBottom || promptOverlapsKeyboard;
  } else if (ctx.promptId) {
    promptVisible = false;
    scrollLostActivePrompt = true;
  }

  let answerVisible = true;
  let answerOverlapsKeyboard = false;
  if (answerEl) {
    const rect = answerEl.getBoundingClientRect();
    answerVisible = elementFitsAboveKeyboard(rect, visibleTop, visibleBottom);
    answerOverlapsKeyboard = keyboardOpen && rect.bottom > visibleBottom;
  }

  return {
    promptVisible,
    answerVisible,
    promptOverlapsKeyboard,
    answerOverlapsKeyboard,
    scrollLostActivePrompt,
    keyboardOpen,
  };
}

function scrollMessagesByDelta(messagesEl: HTMLElement, deltaY: number, behavior: ScrollBehavior) {
  if (Math.abs(deltaY) < 1) return;
  const resolved = resolveChatScrollBehavior(behavior);
  const next = Math.max(
    0,
    Math.min(messagesEl.scrollHeight - messagesEl.clientHeight, messagesEl.scrollTop + deltaY),
  );
  if (next !== messagesEl.scrollTop) {
    messagesEl.scrollTo({ top: next, behavior: resolved });
  }
}

export interface EnsureVisibilityOptions {
  behavior?: ScrollBehavior;
  /** Remote-config force mode — instant multi-pass scroll, visibility over animation. */
  forcePromptVisibilityMode?: boolean;
}

function runSingleEnsurePass(
  ctx: ChatVisibilityContext,
  behavior: ScrollBehavior,
): EnsureVisibilityResult {
  const snapshotBefore = measureChatVisibility(ctx);
  const promptEl = findPromptElement(ctx.messagesEl, ctx.promptId);

  if (!promptEl || ctx.messagesEl.clientHeight <= 0) {
    return { adjusted: false, snapshot: snapshotBefore };
  }

  if (!snapshotBefore.scrollLostActivePrompt && snapshotBefore.promptVisible) {
    return { adjusted: false, snapshot: snapshotBefore };
  }

  const messagesRect = ctx.messagesEl.getBoundingClientRect();
  const visibleBottom = readMeasuredVisibleBottomPx();
  const promptRect = promptEl.getBoundingClientRect();

  let adjusted = false;

  if (promptRect.top < messagesRect.top) {
    scrollMessagesByDelta(ctx.messagesEl, promptRect.top - messagesRect.top, behavior);
    adjusted = true;
  } else if (promptRect.bottom > visibleBottom) {
    scrollMessagesByDelta(ctx.messagesEl, promptRect.bottom - visibleBottom, behavior);
    adjusted = true;
  }

  const snapshotAfter = measureChatVisibility(ctx);
  return { adjusted, snapshot: snapshotAfter };
}

/**
 * Scroll the messages region until the active prompt fits in the measured viewport.
 * Uses getBoundingClientRect — no guessed keyboard heights.
 */
export function ensureChatPromptVisible(
  ctx: ChatVisibilityContext,
  options: EnsureVisibilityOptions = {},
): EnsureVisibilityResult {
  const force = options.forcePromptVisibilityMode ?? false;
  const behavior = force ? "instant" : (options.behavior ?? "instant");
  const maxPasses = force ? 5 : 1;

  let result = runSingleEnsurePass(ctx, behavior);
  if (!force) return result;

  for (let pass = 1; pass < maxPasses; pass += 1) {
    const snap = result.snapshot;
    const stillHidden =
      !snap.promptVisible ||
      snap.promptOverlapsKeyboard ||
      snap.scrollLostActivePrompt;
    if (!stillHidden) break;

    const next = runSingleEnsurePass(ctx, "instant");
    if (!next.adjusted && pass > 0) {
      result = next;
      break;
    }
    result = next;
  }

  return result;
}

export function validateActivePromptVisibility(ctx: ChatVisibilityContext): ChatVisibilitySnapshot {
  const snapshot = measureChatVisibility(ctx);
  const violated =
    !snapshot.promptVisible ||
    snapshot.promptOverlapsKeyboard ||
    snapshot.answerOverlapsKeyboard ||
    snapshot.scrollLostActivePrompt;

  if (import.meta.env.DEV && violated) {
    console.warn("[ChatPlatform] Active prompt visibility contract violated", {
      surface: ctx.surface,
      route: ctx.route,
      promptId: ctx.promptId,
      ...snapshot,
    });
  }

  if (violated && snapshot.keyboardOpen) {
    trackChatPlatformEvent("chat_prompt_hidden_after_keyboard_open", {
      surface: ctx.surface,
      route: ctx.route,
      promptId: ctx.promptId,
      ...snapshot,
    });
  }

  if (violated) {
    trackChatPlatformEvent("keyboard_visibility_failures", {
      surface: ctx.surface,
      route: ctx.route,
      promptId: ctx.promptId,
      ...snapshot,
    });
  }

  return snapshot;
}

export interface SelfHealingVisibilityHandle {
  cancel: () => void;
}

export interface SelfHealingScheduleOptions {
  forcePromptVisibilityMode?: boolean;
}

/** Re-check visibility immediately, on rAF, 50ms, and 150ms — covers OEM keyboard timing. */
export function scheduleSelfHealingVisibility(
  ctx: ChatVisibilityContext,
  onRun: (pass: number) => EnsureVisibilityResult,
  scheduleOptions: SelfHealingScheduleOptions = {},
): SelfHealingVisibilityHandle {
  const timers: number[] = [];
  let cancelled = false;
  let pass = 0;
  const force = scheduleOptions.forcePromptVisibilityMode ?? false;
  const extraDelays = force ? [300, 500, 800] : [];

  const runPass = () => {
    if (cancelled) return;
    pass += 1;
    const result = onRun(pass);
    const snap = result.snapshot;
    const stillHidden =
      !snap.promptVisible ||
      snap.promptOverlapsKeyboard ||
      snap.answerOverlapsKeyboard ||
      snap.scrollLostActivePrompt;

    if (result.adjusted || stillHidden) {
      trackChatPlatformEvent("chat_prompt_recovery_triggered", {
        surface: ctx.surface,
        route: ctx.route,
        promptId: ctx.promptId,
        recoveryPass: pass,
        forcePromptVisibilityMode: force,
        ...snap,
      });
    }
  };

  runPass();
  requestAnimationFrame(() => {
    if (!cancelled) runPass();
    requestAnimationFrame(() => {
      if (!cancelled) runPass();
    });
  });
  timers.push(window.setTimeout(runPass, 50));
  timers.push(window.setTimeout(runPass, 150));
  for (const delay of extraDelays) {
    timers.push(window.setTimeout(runPass, delay));
  }

  return {
    cancel: () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    },
  };
}

export function resolveActiveChatPromptId(
  messages: ReadonlyArray<{ id?: string; role: string }>,
  options: { awaitingAnswer?: boolean } = {},
): string | null {
  if (options.awaitingAnswer === false) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "amy" || msg.role === "assistant" || msg.role === "tutor") {
      return msg.id ?? null;
    }
  }
  return null;
}
