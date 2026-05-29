import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  CHAT_PROMPT_ATTR,
  ensureChatPromptVisible,
  measureChatVisibility,
  resolveActiveChatPromptId,
  scheduleSelfHealingVisibility,
  validateActivePromptVisibility,
} from "@/lib/chat-platform";
import { metricsForChatLayout } from "@/lib/chat-platform/viewport";

function mockScrollContainer(height: number, scrollHeight: number, scrollTop = 0) {
  const el = document.createElement("div");
  Object.defineProperty(el, "clientHeight", { configurable: true, value: height });
  Object.defineProperty(el, "scrollHeight", { configurable: true, value: scrollHeight });
  el.scrollTop = scrollTop;
  el.getBoundingClientRect = () =>
    ({
      top: 0,
      bottom: height,
      left: 0,
      right: 320,
      width: 320,
      height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  el.scrollTo = (opts: ScrollToOptions) => {
    el.scrollTop = opts.top ?? 0;
  };
  return el;
}

describe("ChatPlatform visibility engine", () => {
  describe("resolveActiveChatPromptId", () => {
    it("returns the latest amy or assistant prompt when awaiting an answer", () => {
      expect(
        resolveActiveChatPromptId(
          [
            { id: "a1", role: "amy" },
            { id: "u1", role: "user" },
            { id: "a2", role: "amy" },
          ],
          { awaitingAnswer: true },
        ),
      ).toBe("a2");
    });
  });

  describe("metricsForChatLayout", () => {
    it("does not shrink height using keyboard inset on Android adjustResize shells", () => {
      const originalInnerHeight = window.innerHeight;
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 520 });
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        value: "Mozilla/5.0 (Linux; Android 14) AmyNestAndroid/1.0",
      });

      const metrics = metricsForChatLayout(
        { height: 520, offsetTop: 0, keyboardInset: 280 },
        true,
      );

      expect(metrics.height).toBe(520);
      expect(metrics.keyboardInset).toBe(280);

      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: originalInnerHeight,
      });
    });
  });

  describe("ensureChatPromptVisible", () => {
    it("recovers when active prompt is scrolled out of view (keyboard E2E simulation)", () => {
      const messagesEl = mockScrollContainer(200, 600, 400);
      const inputBar = document.createElement("div");
      inputBar.className = "chat-thread-input";

      const prompt = document.createElement("div");
      prompt.setAttribute(CHAT_PROMPT_ATTR, "q1");
      prompt.getBoundingClientRect = () =>
        ({
          top: -40,
          bottom: 24,
          left: 0,
          right: 280,
          width: 280,
          height: 64,
          x: 0,
          y: -40,
          toJSON: () => ({}),
        }) as DOMRect;
      messagesEl.appendChild(prompt);

      Object.defineProperty(window, "visualViewport", {
        configurable: true,
        value: { height: 320, offsetTop: 0, addEventListener: vi.fn(), removeEventListener: vi.fn() },
      });
      document.documentElement.style.setProperty("--auth-keyboard-inset-native", "280px");

      const ctx = {
        messagesEl,
        inputBarEl: inputBar,
        promptId: "q1",
        surface: "onboarding",
      };

      const before = measureChatVisibility(ctx);
      expect(before.scrollLostActivePrompt).toBe(true);

      const result = ensureChatPromptVisible(ctx, { behavior: "instant" });
      expect(result.adjusted).toBe(true);
      expect(messagesEl.scrollTop).toBeLessThan(400);
    });

    it("runs multiple instant passes in forcePromptVisibilityMode", () => {
      const messagesEl = mockScrollContainer(200, 600, 400);
      const prompt = document.createElement("div");
      prompt.setAttribute(CHAT_PROMPT_ATTR, "q-force");
      let rectTop = -40;
      prompt.getBoundingClientRect = () =>
        ({
          top: rectTop,
          bottom: rectTop + 64,
          left: 0,
          right: 280,
          width: 280,
          height: 64,
          x: 0,
          y: rectTop,
          toJSON: () => ({}),
        }) as DOMRect;
      messagesEl.appendChild(prompt);

      const originalScrollTo = messagesEl.scrollTo;
      messagesEl.scrollTo = (opts: ScrollToOptions) => {
        originalScrollTo.call(messagesEl, opts);
        rectTop = Math.min(rectTop + 20, 0);
      };

      Object.defineProperty(window, "visualViewport", {
        configurable: true,
        value: { height: 320, offsetTop: 0 },
      });
      document.documentElement.style.setProperty("--auth-keyboard-inset-native", "280px");

      const ctx = {
        messagesEl,
        inputBarEl: null,
        promptId: "q-force",
        surface: "assistant",
      };

      ensureChatPromptVisible(ctx, { forcePromptVisibilityMode: true });
      expect(rectTop).toBeGreaterThanOrEqual(-20);
    });
  });

  describe("scheduleSelfHealingVisibility", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("runs visibility passes at 0ms, rAF, 50ms, and 150ms", () => {
      const messagesEl = mockScrollContainer(200, 400, 0);
      const runs: number[] = [];
      const handle = scheduleSelfHealingVisibility(
        {
          messagesEl,
          inputBarEl: null,
          promptId: null,
          surface: "assistant",
        },
        (pass) => {
          runs.push(pass);
          return {
            adjusted: false,
            snapshot: {
              promptVisible: true,
              answerVisible: true,
              promptOverlapsKeyboard: false,
              answerOverlapsKeyboard: false,
              scrollLostActivePrompt: false,
              keyboardOpen: false,
            },
          };
        },
      );

      vi.runAllTimers();
      handle.cancel();
      expect(runs.length).toBeGreaterThanOrEqual(3);
    });

    it("schedules extra passes when forcePromptVisibilityMode is enabled", () => {
      const messagesEl = mockScrollContainer(200, 400, 0);
      const runs: number[] = [];
      const handle = scheduleSelfHealingVisibility(
        {
          messagesEl,
          inputBarEl: null,
          promptId: null,
          surface: "assistant",
        },
        (pass) => {
          runs.push(pass);
          return {
            adjusted: false,
            snapshot: {
              promptVisible: true,
              answerVisible: true,
              promptOverlapsKeyboard: false,
              answerOverlapsKeyboard: false,
              scrollLostActivePrompt: false,
              keyboardOpen: false,
            },
          };
        },
        { forcePromptVisibilityMode: true },
      );

      vi.runAllTimers();
      handle.cancel();
      expect(runs.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe("validateActivePromptVisibility", () => {
    it("flags hidden prompt in dev guard path", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const messagesEl = mockScrollContainer(180, 500, 0);
      const prompt = document.createElement("div");
      prompt.setAttribute(CHAT_PROMPT_ATTR, "hidden-q");
      prompt.getBoundingClientRect = () =>
        ({
          top: 400,
          bottom: 480,
          left: 0,
          right: 280,
          width: 280,
          height: 80,
          x: 0,
          y: 400,
          toJSON: () => ({}),
        }) as DOMRect;
      messagesEl.appendChild(prompt);

      Object.defineProperty(window, "visualViewport", {
        configurable: true,
        value: { height: 300, offsetTop: 0 },
      });
      document.documentElement.style.setProperty("--auth-keyboard-inset-native", "250px");

      const snap = validateActivePromptVisibility({
        messagesEl,
        inputBarEl: null,
        promptId: "hidden-q",
        surface: "onboarding",
      });

      expect(snap.scrollLostActivePrompt || snap.promptOverlapsKeyboard).toBe(true);
      warn.mockRestore();
    });
  });
});
