import { describe, expect, it } from "vitest";
import {
  ONBOARDING_COMPOSER_STEPS,
  ONBOARDING_INTERACTIVE_STEPS,
  buildOnboardingThreadMessages,
} from "@/lib/onboarding-thread-builder";
import { chatMessage } from "@/lib/onboarding-chat-types";

describe("ChatThread onboarding builder", () => {
  const t = ((key: string) => key) as never;

  const baseCtx = {
    isFinishing: false,
    t,
    countryCode: "IN",
    countryName: "India",
    locationState: { status: "needs-permission" },
    locationSource: null as string | null,
    locationRequesting: false,
    regionDrillDown: false,
    countryCodeForRegion: "IN",
    finishError: null as string | null,
    childAgeYears: 0,
    childAgeMonths: 0,
    handlers: {
      onAllowLocation: () => undefined,
      onPickCountryManually: () => undefined,
      onConfirmDetectedCountry: () => undefined,
      onChangeCountry: () => undefined,
    },
  };

  it("maps amy/user messages and appends interactive step UI", () => {
    const messages = buildOnboardingThreadMessages({
      ...baseCtx,
      step: "parent-role",
      messages: [chatMessage("amy", "What is your role?")],
      typing: false,
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ kind: "amy", text: "What is your role?" });
    expect(messages[1]).toMatchObject({ kind: "interactive", id: "step-parent-role" });
  });

  it("keeps country controls visible during short typing delays", () => {
    const messages = buildOnboardingThreadMessages({
      ...baseCtx,
      step: "country-confirm",
      messages: [chatMessage("amy", "Let's get to know your family.")],
      typing: true,
      typingStatusLabel: "Amy is thinking…",
    });

    expect(messages.some((m) => m.kind === "typing" && m.statusLabel === "Amy is thinking…")).toBe(
      true,
    );
    expect(messages.some((m) => m.kind === "interactive" && m.id === "step-country-confirm")).toBe(
      true,
    );
  });

  it("never shows bare intro-boot dots without status copy", () => {
    const messages = buildOnboardingThreadMessages({
      ...baseCtx,
      step: "intro",
      messages: [],
      typing: false,
    });

    const boot = messages.find((m) => m.kind === "typing");
    expect(boot).toMatchObject({
      kind: "typing",
      id: "intro-boot",
      statusLabel: "screens.onboarding.preparing_first_question",
    });
  });

  it("exposes composer vs interactive step sets", () => {
    expect(ONBOARDING_COMPOSER_STEPS.has("child-name")).toBe(false);
    expect(ONBOARDING_INTERACTIVE_STEPS.has("parent-role")).toBe(true);
    expect(ONBOARDING_INTERACTIVE_STEPS.has("child-name")).toBe(true);
    expect(ONBOARDING_INTERACTIVE_STEPS.has("parent-name")).toBe(true);
  });
});
