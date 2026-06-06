import { describe, expect, it } from "vitest";
import {
  ONBOARDING_COMPOSER_STEPS,
  ONBOARDING_INTERACTIVE_STEPS,
  buildOnboardingThreadMessages,
} from "@/lib/onboarding-thread-builder";
import { chatMessage } from "@/lib/onboarding-chat-types";

describe("ChatThread onboarding builder", () => {
  const t = ((key: string) => key) as never;

  it("maps amy/user messages and appends interactive step UI", () => {
    const messages = buildOnboardingThreadMessages({
      step: "parent-role",
      messages: [chatMessage("amy", "What is your role?")],
      typing: false,
      isFinishing: false,
      t,
      countryCode: "IN",
      countryName: "India",
      locationState: { status: "idle" },
      locationSource: null,
      locationRequesting: false,
      regionDrillDown: false,
      countryCodeForRegion: "IN",
      finishError: null,
      handlers: {
        onAllowLocation: () => undefined,
        onPickCountryManually: () => undefined,
        onConfirmDetectedCountry: () => undefined,
        onChangeCountry: () => undefined,
      },
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ kind: "amy", text: "What is your role?" });
    expect(messages[1]).toMatchObject({ kind: "interactive", id: "step-parent-role" });
  });

  it("exposes composer vs interactive step sets", () => {
    expect(ONBOARDING_COMPOSER_STEPS.has("child-name")).toBe(false);
    expect(ONBOARDING_INTERACTIVE_STEPS.has("parent-role")).toBe(true);
    expect(ONBOARDING_INTERACTIVE_STEPS.has("child-name")).toBe(true);
    expect(ONBOARDING_INTERACTIVE_STEPS.has("parent-name")).toBe(true);
  });
});
