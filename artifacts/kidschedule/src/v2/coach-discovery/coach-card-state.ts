/**
 * Coach presentation — Study Room / Living Room whisper.
 * Companion verbs · not “plan” SaaS · not setup.
 */

import type { CoachDiscoveryOffer } from "./worry-map";
import type { PreparedCoachPlan } from "./prepared-plan";

export type CoachCardMode =
  | "build_my_plan"
  | "continue_your_plan"
  | "start_your_plan"
  | "continue_plan"
  | "new_goal";

export type CoachCardPresentation = {
  mode: CoachCardMode;
  headline: string;
  body: string;
  ctaLabel: string;
  href: string;
  /** data-resumable for guest prepared continuity */
  resumable: boolean;
};

function concernPhrase(label: string): string {
  return label.trim() || "this";
}

function childName(name: string | null | undefined): string | null {
  const n = name?.trim();
  return n || null;
}

export function resolveGuestCoachCard(input: {
  offer: CoachDiscoveryOffer;
  prepared: PreparedCoachPlan | null;
  /** Existing guest name — presence only, never invents. */
  childName?: string | null;
}): CoachCardPresentation {
  const concern = concernPhrase(input.offer.challengeLabel);
  const who = childName(input.childName);
  const preparedMatches =
    Boolean(input.prepared) &&
    input.prepared!.goalId === input.offer.goalId;

  if (preparedMatches) {
    return {
      mode: "continue_your_plan",
      headline: who
        ? `Amy still holds ${who}'s path`
        : `Amy still holds your ${concern} path`,
      body: "Continue when you're ready.",
      ctaLabel: "Continue with Amy",
      href: "/today/coach-plan",
      resumable: true,
    };
  }

  return {
    mode: "build_my_plan",
    headline: who
      ? `Amy already sees what matters for ${who}`
      : `Amy already sees what matters for ${concern.toLowerCase()}`,
    body: "Quiet guidance when you're ready.",
    ctaLabel: "Continue with Amy",
    href: "/today/coach-plan",
    resumable: false,
  };
}

/**
 * Signed-in: Start / Continue / New Goal from existing Coach progress signals.
 * `hasActiveOrPausedSession` = primary in-progress session exists.
 * `hasCompletedJourney` = at least one completed goal, no active session.
 */
export function resolveSignedInCoachCard(input: {
  offer: CoachDiscoveryOffer;
  hasActiveOrPausedSession: boolean;
  resumeSessionId: string | null;
  hasCompletedJourney: boolean;
  childName?: string | null;
}): CoachCardPresentation {
  const concern = concernPhrase(input.offer.challengeLabel);
  const who = childName(input.childName);

  if (input.hasActiveOrPausedSession && input.resumeSessionId) {
    return {
      mode: "continue_plan",
      headline: who
        ? `Amy still holds ${who}'s path`
        : `Amy still holds your ${concern} path`,
      body: "Continue when you're ready.",
      ctaLabel: "Continue with Amy",
      href: `/amy-coach?resume=${encodeURIComponent(input.resumeSessionId)}`,
      resumable: true,
    };
  }

  if (input.hasCompletedJourney) {
    return {
      mode: "new_goal",
      headline: who
        ? `Amy is here for ${who}'s next stretch`
        : "Amy is here for the next stretch",
      body: "Only when it feels right.",
      ctaLabel: "When you're ready",
      href: "/amy-coach",
      resumable: false,
    };
  }

  return {
    mode: "start_your_plan",
    headline: who
      ? `Amy already sees what matters for ${who}`
      : `Amy already sees what matters for ${concern.toLowerCase()}`,
    body: "Begin when you're ready.",
    ctaLabel: "Begin with Amy",
    href: "/amy-coach",
    resumable: false,
  };
}

/**
 * Ready-gate — living understanding revealed. Never “plan ready” / generate.
 * Account is whisper truth, not climax. Living Room card helpers untouched above.
 */
export function buildCoachReadyGate(
  challengeLabel: string,
  childName?: string | null,
): {
  headline: string;
  body: string;
  accountWhisper: string;
} {
  const concern = concernPhrase(challengeLabel);
  const who = childName?.trim() || null;
  return {
    headline: who
      ? `Amy already understands ${who}'s ${concern}.`
      : `Amy already understands your ${concern}.`,
    body: "What matters is already clear. Care is taking shape around it — Amy stays beside you.",
    accountWhisper: "Save this place when you're ready.",
  };
}

/** Default ready-gate (no concern) — prefer buildCoachReadyGate when offer exists. */
export const COACH_READY_GATE = buildCoachReadyGate("parenting");
