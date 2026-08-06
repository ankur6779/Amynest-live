import { describe, expect, it } from "vitest";
import {
  buildCoachReadyGate,
  COACH_READY_GATE,
  resolveGuestCoachCard,
  resolveSignedInCoachCard,
} from "./coach-card-state";
import type { CoachDiscoveryOffer } from "./worry-map";

const offer: CoachDiscoveryOffer = {
  worryId: "behavior",
  challengeLabel: "Behaviour & tantrums",
  goalId: "toddler-tantrums",
  goalTitle: "Toddler tantrums",
  categoryId: "behaviour",
};

describe("coach-card-state", () => {
  it("guest: Continue with Amy when nothing prepared", () => {
    const p = resolveGuestCoachCard({ offer, prepared: null });
    expect(p.ctaLabel).toBe("Continue with Amy");
    expect(p.mode).toBe("build_my_plan");
    expect(p.href).toBe("/today/coach-plan");
    expect(p.headline.toLowerCase()).toMatch(/sees what matters|amy/);
    expect(p.headline.toLowerCase()).not.toMatch(/setup|waiting|configuration|build/);
    expect(p.body.toLowerCase()).toMatch(/ready|quiet|guidance/);
    expect(p.ctaLabel.toLowerCase()).not.toMatch(/plan|build|generate/);
  });

  it("guest: Continue with Amy when prepared matches", () => {
    const p = resolveGuestCoachCard({
      offer,
      prepared: {
        goalId: "toddler-tantrums",
        goalTitle: "Toddler tantrums",
        categoryId: "behaviour",
        worryId: "behavior",
        challengeLabel: "Behaviour & tantrums",
        gateDismissed: true,
        preparedAt: new Date().toISOString(),
      },
    });
    expect(p.ctaLabel).toBe("Continue with Amy");
    expect(p.mode).toBe("continue_your_plan");
    expect(p.resumable).toBe(true);
    expect(p.headline.toLowerCase()).toMatch(/holds|path|amy/);
    expect(p.headline.toLowerCase()).not.toMatch(/setup|waiting/);
  });

  it("guest: child name strengthens continue headline when present", () => {
    const p = resolveGuestCoachCard({
      offer,
      prepared: {
        goalId: "toddler-tantrums",
        goalTitle: "Toddler tantrums",
        categoryId: "behaviour",
        worryId: "behavior",
        challengeLabel: "Behaviour & tantrums",
        gateDismissed: true,
        preparedAt: new Date().toISOString(),
      },
      childName: "Aria",
    });
    expect(p.headline).toBe("Amy still holds Aria's path");
  });

  it("guest: Sleep concern appears in continue headline", () => {
    const sleepOffer: CoachDiscoveryOffer = {
      worryId: "sleep",
      challengeLabel: "Sleep",
      goalId: "improve-sleep-patterns",
      goalTitle: "Improve Sleep Patterns",
      categoryId: "sleep",
    };
    const p = resolveGuestCoachCard({
      offer: sleepOffer,
      prepared: {
        goalId: "improve-sleep-patterns",
        goalTitle: "Improve Sleep Patterns",
        categoryId: "sleep",
        worryId: "sleep",
        challengeLabel: "Sleep",
        gateDismissed: true,
        preparedAt: new Date().toISOString(),
      },
    });
    expect(p.headline).toBe("Amy still holds your Sleep path");
  });

  it("signed-in: Begin with Amy with no journey", () => {
    const p = resolveSignedInCoachCard({
      offer,
      hasActiveOrPausedSession: false,
      resumeSessionId: null,
      hasCompletedJourney: false,
    });
    expect(p.ctaLabel).toBe("Begin with Amy");
    expect(p.href).toBe("/amy-coach");
    expect(p.headline.toLowerCase()).not.toMatch(/setup|waiting/);
  });

  it("signed-in: Continue with Amy with active session", () => {
    const p = resolveSignedInCoachCard({
      offer,
      hasActiveOrPausedSession: true,
      resumeSessionId: "sess-1",
      hasCompletedJourney: false,
    });
    expect(p.ctaLabel).toBe("Continue with Amy");
    expect(p.href).toBe("/amy-coach?resume=sess-1");
  });

  it("signed-in: When you're ready when completed and no active", () => {
    const p = resolveSignedInCoachCard({
      offer,
      hasActiveOrPausedSession: false,
      resumeSessionId: null,
      hasCompletedJourney: true,
    });
    expect(p.ctaLabel).toBe("When you're ready");
  });

  it("ready gate is understanding-first; account is whisper", () => {
    const gate = buildCoachReadyGate("Sleep");
    expect(gate.headline).toMatch(/Amy already understands your Sleep/i);
    expect(gate.headline.toLowerCase()).not.toMatch(
      /setup|waiting|configuration|plan is ready|\bpath\b/,
    );
    expect(gate.body.toLowerCase()).toMatch(/care is taking shape|beside you|clear/);
    expect(gate.body.toLowerCase()).not.toMatch(
      /generate|processing|analys|plan is ready|intelligence/,
    );
    expect(gate.accountWhisper.toLowerCase()).toMatch(/save this place/);
    expect(gate.body.toLowerCase()).not.toMatch(/create your account/);
    expect(COACH_READY_GATE.headline.toLowerCase()).toContain("understands");
  });
});
