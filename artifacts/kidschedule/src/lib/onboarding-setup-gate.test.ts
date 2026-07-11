import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SetupStatus } from "@/lib/setup-status";

const loadSession = vi.fn();

vi.mock("@/lib/onboarding-chat-session", () => ({
  loadOnboardingChatSession: () => loadSession(),
}));

describe("onboarding setup gate", () => {
  beforeEach(() => {
    vi.resetModules();
    loadSession.mockReset();
    vi.stubEnv("VITE_FF_ONBOARDING_STRICT_COMPLETE_GATE", "");
  });

  it("shouldSkipOnboardingPage accepts profileComplete when strict gate is off", async () => {
    const { shouldSkipOnboardingPage } = await import("./onboarding-setup-gate");
    const status: SetupStatus = { onboardingComplete: false, profileComplete: true };
    expect(shouldSkipOnboardingPage(status)).toBe(true);
  });

  it("shouldSkipOnboardingPage requires onboardingComplete when strict gate is on", async () => {
    vi.stubEnv("VITE_FF_ONBOARDING_STRICT_COMPLETE_GATE", "1");
    const { shouldSkipOnboardingPage } = await import("./onboarding-setup-gate");
    expect(
      shouldSkipOnboardingPage({ onboardingComplete: false, profileComplete: true }),
    ).toBe(false);
    expect(
      shouldSkipOnboardingPage({ onboardingComplete: true, profileComplete: true }),
    ).toBe(true);
  });

  it("hasActiveOnboardingChatSession detects mid-flow resume steps", async () => {
    loadSession.mockReturnValue({ step: "child-dob", data: {} });
    const { hasActiveOnboardingChatSession } = await import("./onboarding-setup-gate");
    expect(hasActiveOnboardingChatSession()).toBe(true);
  });

  it("hasActiveOnboardingChatSession ignores intro", async () => {
    loadSession.mockReturnValue({ step: "intro", data: {} });
    const { hasActiveOnboardingChatSession } = await import("./onboarding-setup-gate");
    expect(hasActiveOnboardingChatSession()).toBe(false);
  });
});
