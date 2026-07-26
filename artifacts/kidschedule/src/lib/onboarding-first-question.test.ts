import { describe, expect, it } from "vitest";
import { chatMessage } from "@/lib/onboarding-chat-types";
import {
  ONBOARDING_FIRST_QUESTION_TARGET_MS,
  ONBOARDING_MAX_LOADING_MS,
  ONBOARDING_THINKING_STATUS_MS,
  buildStaticFirstQuestionMessages,
  clampAmyDelay,
  isStep1LoadingDeadEnd,
  loadingStatusMessageKey,
  mergeWithoutDuplicateIds,
  messagesIncludeFirstQuestion,
  resolveFreshOnboardingBoot,
  resolveLoadingStatusPhase,
} from "@/lib/onboarding-first-question";

const t = ((key: string, opts?: { name?: string }) => {
  if (key === "screens.onboarding.intro_greeting") {
    return `Hi ${opts?.name ?? "there"}! I'm Amy`;
  }
  if (key === "screens.onboarding.intro_default_name") return "there";
  if (key === "screens.onboarding.intro_first_question") {
    return "Who will you be using Amy for today?";
  }
  if (key === "screens.onboarding.country_transition_msg") {
    return "I'll use your location to detect your country.";
  }
  return key;
}) as never;

describe("onboarding first-question failsafe", () => {
  it("builds static first-question messages with stable ids", () => {
    const messages = buildStaticFirstQuestionMessages(t, "Sam");
    expect(messages).toHaveLength(3);
    expect(messages[0]?.text).toContain("Sam");
    expect(messages[1]?.text).toContain("Who will you be using Amy");
    expect(messagesIncludeFirstQuestion(messages)).toBe(true);
  });

  it("seeds country-confirm immediately for fresh launches", () => {
    const started = performance.now();
    const boot = resolveFreshOnboardingBoot({ t, firstName: "Alex" });
    const elapsed = performance.now() - started;
    expect(boot.seededFresh).toBe(true);
    expect(boot.step).toBe("country-confirm");
    expect(boot.messages.length).toBeGreaterThan(0);
    expect(messagesIncludeFirstQuestion(boot.messages)).toBe(true);
    // Sync seed — must be far under the 1s production SLO for time-to-first-question.
    expect(elapsed).toBeLessThan(ONBOARDING_FIRST_QUESTION_TARGET_MS);
  });

  it("keeps first question available offline (no network dependency)", () => {
    const boot = resolveFreshOnboardingBoot({ t });
    expect(boot.messages.some((m) => m.id === "onboarding-first-question")).toBe(true);
    expect(boot.step).toBe("country-confirm");
  });

  it("preserves mid-flow restored sessions without reseeding", () => {
    const restored = [chatMessage("amy", "What's their name?", "child-q")];
    const boot = resolveFreshOnboardingBoot({
      t,
      restoredStep: "child-name",
      restoredMessages: restored,
    });
    expect(boot.seededFresh).toBe(false);
    expect(boot.step).toBe("child-name");
    expect(boot.messages).toEqual(restored);
  });

  it("recovers stuck intro/empty sessions onto country-confirm", () => {
    const boot = resolveFreshOnboardingBoot({
      t,
      restoredStep: "intro",
      restoredMessages: [],
    });
    expect(boot.step).toBe("country-confirm");
    expect(boot.seededFresh).toBe(true);
  });

  it("does not duplicate stable first-question ids", () => {
    const seeded = buildStaticFirstQuestionMessages(t, "Sam");
    const merged = mergeWithoutDuplicateIds(seeded, seeded);
    expect(merged).toHaveLength(3);
  });

  it("caps amy delay at 3 seconds", () => {
    expect(clampAmyDelay(700)).toBe(700);
    expect(clampAmyDelay(10_000)).toBe(ONBOARDING_MAX_LOADING_MS);
    expect(clampAmyDelay(-5)).toBe(0);
  });

  it("progresses loading status copy through thinking → preparing → fallback", () => {
    expect(resolveLoadingStatusPhase(0)).toBe("thinking");
    expect(resolveLoadingStatusPhase(ONBOARDING_THINKING_STATUS_MS)).toBe("preparing");
    expect(resolveLoadingStatusPhase(ONBOARDING_MAX_LOADING_MS)).toBe("fallback");
    expect(loadingStatusMessageKey("thinking")).toBe("amy_thinking");
    expect(loadingStatusMessageKey("preparing")).toBe("preparing_first_question");
    expect(loadingStatusMessageKey("fallback")).toBe("lets_start_manually");
  });

  it("flags typing and locating spinners as step-1 dead ends", () => {
    expect(
      isStep1LoadingDeadEnd({
        step: "intro",
        typing: false,
        messages: [],
        locationStatus: "idle",
      }),
    ).toBe(true);
    expect(
      isStep1LoadingDeadEnd({
        step: "country-confirm",
        typing: true,
        messages: buildStaticFirstQuestionMessages(t, "Sam"),
        locationStatus: "needs-permission",
      }),
    ).toBe(true);
    expect(
      isStep1LoadingDeadEnd({
        step: "country-confirm",
        typing: false,
        messages: buildStaticFirstQuestionMessages(t, "Sam"),
        locationStatus: "fetching",
      }),
    ).toBe(true);
    expect(
      isStep1LoadingDeadEnd({
        step: "country-confirm",
        typing: false,
        messages: buildStaticFirstQuestionMessages(t, "Sam"),
        locationStatus: "needs-permission",
      }),
    ).toBe(false);
  });
});
