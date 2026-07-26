import { beforeEach, describe, expect, it } from "vitest";
import { chatMessage } from "@/lib/onboarding-chat-types";
import { loadOnboardingChatSession } from "@/lib/onboarding-chat-session";
import {
  canFlushOnboardingStep,
  flushOnboardingSessionSnapshot,
  persistOnboardingBootSeed,
} from "@/lib/onboarding-session-flush";

describe("onboarding session flush", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("allows flushing chat steps and rejects terminal steps", () => {
    expect(canFlushOnboardingStep("country-confirm")).toBe(true);
    expect(canFlushOnboardingStep("child-name")).toBe(true);
    expect(canFlushOnboardingStep("done")).toBe(false);
    expect(canFlushOnboardingStep("notifications")).toBe(false);
  });

  it("synchronously persists boot seed so kill during Step 1 is recoverable", () => {
    persistOnboardingBootSeed({
      step: "country-confirm",
      messages: [
        chatMessage("amy", "Hi! I'm Amy", "onboarding-intro-greeting"),
        chatMessage("amy", "Who will you be using Amy for today?", "onboarding-first-question"),
      ],
      textInput: "",
      countryCode: "",
      countryName: "",
      curr: {},
      parent: {},
      children: [],
    });

    const restored = loadOnboardingChatSession();
    expect(restored?.step).toBe("country-confirm");
    expect(restored?.data.messages.length).toBe(2);
    expect(restored?.data.messages[1]?.id).toBe("onboarding-first-question");
  });

  it("flushes mid-flow country choice for process-kill resume", () => {
    flushOnboardingSessionSnapshot({
      step: "country-confirm",
      messages: [chatMessage("amy", "Country?", "q1")],
      textInput: "",
      countryCode: "IN",
      countryName: "India",
      curr: {},
      parent: { country: "IN" },
      children: [],
    });

    const restored = loadOnboardingChatSession();
    expect(restored?.data.countryCode).toBe("IN");
    expect(restored?.data.countryName).toBe("India");
  });
});
