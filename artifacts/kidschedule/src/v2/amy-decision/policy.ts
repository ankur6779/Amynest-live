/**
 * Amy Decision Policy — swap policy for future wedges; do not fork the engine.
 */

import { AMY_REASON, type AmyReasonCode } from "./reason-codes";

/** Decision payload schema version. */
export const AMY_DECISION_VERSION = "amy_decision.v1" as const;

/** Experience ids — string references only (no registry imports). */
export const AMY_EXPERIENCE = {
  SPEECH_MISSION: "speech_mission",
  AMY_COACH: "amy_coach",
  ASK_AMY: "ask_amy",
  FOR_CHILD: "for_child",
} as const;

export type AmyExperienceId =
  (typeof AMY_EXPERIENCE)[keyof typeof AMY_EXPERIENCE];

export type AmyDecisionPolicy = Readonly<{
  policyId: string;
  policyVersion: string;
  /** Ordered Hero candidates (index 0 = current wedge / mission experience). */
  heroPriority: ReadonlyArray<AmyExperienceId>;
  /** Ordered Secondary candidates. */
  secondaryPriority: ReadonlyArray<AmyExperienceId>;
  /** Ordered Passive candidates. */
  passivePriority: ReadonlyArray<AmyExperienceId>;
  /** Higher weight sorts earlier in reasonCodes (QA/debug). */
  reasonWeights: Readonly<Partial<Record<AmyReasonCode, number>>>;
}>;

const DEFAULT_REASON_WEIGHTS: Readonly<Partial<Record<AmyReasonCode, number>>> =
  {
    [AMY_REASON.SAFETY_PLACEHOLDER]: 100,
    [AMY_REASON.MISSION_INCOMPLETE]: 90,
    [AMY_REASON.MISSION_COMPLETE]: 90,
    [AMY_REASON.SPEECH_PRIORITY]: 85,
    [AMY_REASON.COACH_ACTIVE]: 80,
    [AMY_REASON.COACH_PREPARED]: 78,
    [AMY_REASON.COACH_PAUSED]: 76,
    [AMY_REASON.CHALLENGE_PRESENT]: 70,
    [AMY_REASON.SPEECH_CONCERN]: 65,
    [AMY_REASON.NO_CHALLENGE]: 40,
    [AMY_REASON.GUEST_USER]: 30,
    [AMY_REASON.SIGNED_IN]: 30,
    [AMY_REASON.PREMIUM_UNLOCKED]: 25,
    [AMY_REASON.PREMIUM_ELIGIBLE]: 20,
    [AMY_REASON.PREMIUM_LOCKED]: 15,
    [AMY_REASON.COACH_NONE]: 10,
    [AMY_REASON.BUDGET_HERO]: 5,
    [AMY_REASON.BUDGET_SECONDARY]: 4,
    [AMY_REASON.BUDGET_PASSIVE]: 3,
    [AMY_REASON.UNKNOWN_CAPABILITY]: 50,
  };

/**
 * Current frozen V2 Speech-wedge policy.
 * Future wedges = new AmyDecisionPolicy object, same engine.
 */
export const MVP_SPEECH_WEDGE_POLICY: AmyDecisionPolicy = Object.freeze({
  policyId: "mvp_speech_wedge",
  policyVersion: "mvp_speech_wedge.v1",
  heroPriority: Object.freeze([
    AMY_EXPERIENCE.SPEECH_MISSION,
    AMY_EXPERIENCE.AMY_COACH,
    AMY_EXPERIENCE.ASK_AMY,
    AMY_EXPERIENCE.FOR_CHILD,
  ] as AmyExperienceId[]),
  secondaryPriority: Object.freeze([
    AMY_EXPERIENCE.AMY_COACH,
    AMY_EXPERIENCE.ASK_AMY,
    AMY_EXPERIENCE.FOR_CHILD,
  ] as AmyExperienceId[]),
  passivePriority: Object.freeze([
    AMY_EXPERIENCE.FOR_CHILD,
    AMY_EXPERIENCE.ASK_AMY,
  ] as AmyExperienceId[]),
  reasonWeights: Object.freeze({ ...DEFAULT_REASON_WEIGHTS }),
});

/** @deprecated Prefer MVP_SPEECH_WEDGE_POLICY.policyVersion */
export const AMY_DECISION_POLICY_VERSION =
  MVP_SPEECH_WEDGE_POLICY.policyVersion;

/** @deprecated Prefer MVP_SPEECH_WEDGE_POLICY.heroPriority */
export const AMY_HERO_PRIORITY_ORDER = MVP_SPEECH_WEDGE_POLICY.heroPriority;

/** Reference maps — ids only, not live registry reads. */
export const AMY_EXPERIENCE_REFS: Readonly<
  Record<
    string,
    {
      featureIds: readonly string[];
      routeIds: readonly string[];
      toolIds: readonly string[];
    }
  >
> = {
  speech_mission: {
    featureIds: ["speech_coach", "talking_amy"],
    routeIds: ["/today/mission"],
    toolIds: [],
  },
  amy_coach: {
    featureIds: ["amy_coach"],
    routeIds: ["/amy-coach", "/today/coach-plan"],
    toolIds: [],
  },
  ask_amy: {
    featureIds: ["ask_amy"],
    routeIds: ["/ask-amy"],
    toolIds: [],
  },
  for_child: {
    featureIds: ["for_child"],
    routeIds: ["/for-child"],
    toolIds: [],
  },
};

export const AMY_ACTION = {
  START_MISSION: "start_mission",
  CONTINUE_MISSION: "continue_mission",
  CONTINUE_COACH: "continue_coach",
  START_COACH: "start_coach",
  OPEN_GUIDE: "open_guide",
  EXPLORE_TREASURY: "explore_treasury",
  WAIT: "wait",
} as const;

export const AMY_JOURNEY = {
  SPEECH_DAILY: "speech_daily",
  COACH_LONG_TERM: "coach_long_term",
  GUIDE_IMMEDIATE: "guide_immediate",
  TREASURY: "treasury",
  NONE: "none",
} as const;

export const AMY_CTA = {
  START_MISSION: "start_mission",
  CONTINUE_PLAN: "continue_plan",
  START_PLAN: "start_plan",
  ASK_AMY_NOW: "ask_amy_now",
  EXPLORE_FOR_CHILD: "explore_for_child",
  NONE: "none",
} as const;

export function sortReasonCodes(
  codes: readonly AmyReasonCode[],
  weights: AmyDecisionPolicy["reasonWeights"],
): AmyReasonCode[] {
  return [...codes].sort((a, b) => {
    const wa = weights[a] ?? 0;
    const wb = weights[b] ?? 0;
    if (wb !== wa) return wb - wa;
    return a.localeCompare(b);
  });
}
