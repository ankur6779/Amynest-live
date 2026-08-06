/**
 * createAmyDecision — pure Decision Engine.
 * Input: AmyContext only. Output: AmyDecision.
 * Policy is injectable — future wedges swap policy, not engine code.
 */

import type { AmyContext } from "@/v2/amy-context";
import { freezeDeep } from "./freeze";
import {
  AMY_ACTION,
  AMY_CTA,
  AMY_DECISION_VERSION,
  AMY_EXPERIENCE,
  AMY_EXPERIENCE_REFS,
  AMY_JOURNEY,
  MVP_SPEECH_WEDGE_POLICY,
  sortReasonCodes,
  type AmyDecisionPolicy,
  type AmyExperienceId,
} from "./policy";
import { AMY_REASON, type AmyReasonCode } from "./reason-codes";
import type { AmyDecisionTrace, AmyDecisionTraceStep } from "./trace";
import type {
  AmyDecision,
  AmyDecisionConfidence,
  CreateAmyDecisionOptions,
  CreateAmyDecisionResult,
} from "./types";
import { validateAmyDecisionPolicy } from "./validate-policy";

const KNOWN_CAPABILITY_KEYS = [
  "isGuest",
  "isSignedIn",
  "hasCoachJourney",
  "hasSpeechConcern",
  "hasCompletedMissionToday",
  "hasPreparedPlan",
  "premiumEligible",
  "premiumUnlocked",
] as const;

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function ref(experienceId: AmyExperienceId) {
  return { experienceId };
}

function firstOf(
  order: readonly AmyExperienceId[],
  exclude: ReadonlySet<AmyExperienceId>,
): AmyExperienceId | null {
  for (const id of order) {
    if (!exclude.has(id)) return id;
  }
  return null;
}

function findInPolicy(
  policy: AmyDecisionPolicy,
  id: AmyExperienceId,
): AmyExperienceId | null {
  if (policy.heroPriority.includes(id)) return id;
  if (policy.secondaryPriority.includes(id)) return id;
  if (policy.passivePriority.includes(id)) return id;
  return null;
}

function readCapability(ctx: AmyContext, key: string): boolean | "unknown" {
  const caps = ctx.capabilities as unknown as Record<string, unknown>;
  if (!(key in caps)) return "unknown";
  const v = caps[key];
  if (typeof v !== "boolean") return "unknown";
  return v;
}

function detectUnknownCapabilities(ctx: AmyContext): string[] {
  const caps = ctx.capabilities as unknown as Record<string, unknown>;
  const unknown: string[] = [];
  const known = new Set<string>(KNOWN_CAPABILITY_KEYS);
  for (const key of Object.keys(caps)) {
    if (!known.has(key)) unknown.push(key);
    else if (typeof caps[key] !== "boolean") unknown.push(key);
  }
  return unknown;
}

function collectBaseReasons(
  ctx: AmyContext,
  unknownCapabilities: readonly string[],
): AmyReasonCode[] {
  const codes: AmyReasonCode[] = [AMY_REASON.SAFETY_PLACEHOLDER];

  if (unknownCapabilities.length > 0) {
    codes.push(AMY_REASON.UNKNOWN_CAPABILITY);
  }

  const isGuest = readCapability(ctx, "isGuest");
  if (isGuest === "unknown") codes.push(AMY_REASON.UNKNOWN_CAPABILITY);
  else if (isGuest) codes.push(AMY_REASON.GUEST_USER);
  else codes.push(AMY_REASON.SIGNED_IN);

  const missionDone = readCapability(ctx, "hasCompletedMissionToday");
  if (missionDone === "unknown") codes.push(AMY_REASON.UNKNOWN_CAPABILITY);
  else if (missionDone) codes.push(AMY_REASON.MISSION_COMPLETE);
  else codes.push(AMY_REASON.MISSION_INCOMPLETE);

  const speechConcern = readCapability(ctx, "hasSpeechConcern");
  if (speechConcern === "unknown") codes.push(AMY_REASON.UNKNOWN_CAPABILITY);
  else if (speechConcern) {
    codes.push(AMY_REASON.SPEECH_CONCERN);
    codes.push(AMY_REASON.SPEECH_PRIORITY);
  }

  if (!ctx.challenge.worryId) codes.push(AMY_REASON.NO_CHALLENGE);
  else codes.push(AMY_REASON.CHALLENGE_PRESENT);

  const hasPrepared = readCapability(ctx, "hasPreparedPlan");
  if (hasPrepared === "unknown") codes.push(AMY_REASON.UNKNOWN_CAPABILITY);
  else if (hasPrepared || ctx.coach.status === "prepared") {
    codes.push(AMY_REASON.COACH_PREPARED);
  } else if (ctx.coach.status === "active") {
    codes.push(AMY_REASON.COACH_ACTIVE);
  } else if (ctx.coach.status === "paused") {
    codes.push(AMY_REASON.COACH_PAUSED);
  } else {
    codes.push(AMY_REASON.COACH_NONE);
  }

  const premiumUnlocked = readCapability(ctx, "premiumUnlocked");
  const premiumEligible = readCapability(ctx, "premiumEligible");
  if (premiumUnlocked === "unknown" || premiumEligible === "unknown") {
    codes.push(AMY_REASON.UNKNOWN_CAPABILITY);
  } else if (premiumUnlocked) {
    codes.push(AMY_REASON.PREMIUM_UNLOCKED);
  } else if (premiumEligible) {
    codes.push(AMY_REASON.PREMIUM_ELIGIBLE);
  } else {
    codes.push(AMY_REASON.PREMIUM_LOCKED);
  }

  return codes;
}

type SlotPlan = {
  primary: AmyExperienceId;
  secondary: AmyExperienceId | null;
  passive: AmyExperienceId | null;
  action: string;
  journey: string;
  cta: string;
  confidence: AmyDecisionConfidence;
  extraReasons: AmyReasonCode[];
  steps: AmyDecisionTraceStep[];
};

function planSlots(ctx: AmyContext, policy: AmyDecisionPolicy): SlotPlan {
  const steps: AmyDecisionTraceStep[] = [];
  const wedge = policy.heroPriority[0] ?? AMY_EXPERIENCE.SPEECH_MISSION;
  const coachId =
    findInPolicy(policy, AMY_EXPERIENCE.AMY_COACH) ?? AMY_EXPERIENCE.AMY_COACH;
  const guideId =
    findInPolicy(policy, AMY_EXPERIENCE.ASK_AMY) ?? AMY_EXPERIENCE.ASK_AMY;
  const treasuryId =
    findInPolicy(policy, AMY_EXPERIENCE.FOR_CHILD) ?? AMY_EXPERIENCE.FOR_CHILD;

  const missionDone = readCapability(ctx, "hasCompletedMissionToday");
  const missionOpen = missionDone === false;
  const hasPrepared = readCapability(ctx, "hasPreparedPlan");
  const coachReady =
    hasPrepared === true ||
    ctx.coach.status === "prepared" ||
    ctx.coach.status === "active" ||
    ctx.coach.status === "paused";
  const hasChallenge = Boolean(ctx.challenge.worryId);
  const speechConcern = readCapability(ctx, "hasSpeechConcern") === true;

  const pushStep = (
    stepId: string,
    principle: string,
    selected: string | null,
    rejected: string[],
    reasonCodes: AmyReasonCode[],
    weight: number,
  ) => {
    steps.push({
      stepId,
      principle,
      selected,
      rejected,
      reasonCodes,
      weight,
    });
  };

  if (missionOpen) {
    const secondaryFinal = coachReady
      ? policy.secondaryPriority.includes(coachId)
        ? coachId
        : firstOf(policy.secondaryPriority, new Set([wedge]))
      : policy.secondaryPriority.includes(guideId)
        ? guideId
        : firstOf(policy.secondaryPriority, new Set([wedge]));
    const passive = firstOf(
      policy.passivePriority,
      new Set(
        [wedge, secondaryFinal].filter(Boolean) as AmyExperienceId[],
      ),
    );
    pushStep(
      "mission_continuity",
      "mission_continuity",
      wedge,
      [...policy.heroPriority.filter((id) => id !== wedge)],
      [AMY_REASON.MISSION_INCOMPLETE, AMY_REASON.SPEECH_PRIORITY],
      policy.reasonWeights[AMY_REASON.MISSION_INCOMPLETE] ?? 90,
    );
    return {
      primary: wedge,
      secondary: secondaryFinal,
      passive,
      action:
        ctx.speech.todayMissionStatus === "available"
          ? AMY_ACTION.CONTINUE_MISSION
          : AMY_ACTION.START_MISSION,
      journey: AMY_JOURNEY.SPEECH_DAILY,
      cta: AMY_CTA.START_MISSION,
      confidence: "HIGH",
      extraReasons: [
        AMY_REASON.SPEECH_PRIORITY,
        AMY_REASON.BUDGET_HERO,
        AMY_REASON.BUDGET_SECONDARY,
        ...(passive ? [AMY_REASON.BUDGET_PASSIVE] : []),
      ],
      steps,
    };
  }

  pushStep(
    "mission_complete",
    "mission_continuity",
    null,
    [wedge],
    [AMY_REASON.MISSION_COMPLETE],
    policy.reasonWeights[AMY_REASON.MISSION_COMPLETE] ?? 90,
  );

  if (coachReady) {
    const primaryFinal = policy.heroPriority.includes(coachId)
      ? coachId
      : (firstOf(policy.heroPriority, new Set([wedge])) ?? coachId);
    const secondary = firstOf(
      policy.secondaryPriority,
      new Set([primaryFinal]),
    );
    const passive = firstOf(
      policy.passivePriority,
      new Set([primaryFinal, secondary].filter(Boolean) as AmyExperienceId[]),
    );
    pushStep(
      "coach_continuity",
      "coach_continuity",
      primaryFinal,
      [...policy.heroPriority.filter((id) => id !== primaryFinal)],
      [AMY_REASON.COACH_PREPARED],
      policy.reasonWeights[AMY_REASON.COACH_PREPARED] ?? 78,
    );
    const action =
      ctx.coach.status === "active" || ctx.coach.status === "paused"
        ? AMY_ACTION.CONTINUE_COACH
        : hasPrepared === true
          ? AMY_ACTION.CONTINUE_COACH
          : AMY_ACTION.START_COACH;
    const cta =
      ctx.coach.status === "active" ||
      ctx.coach.status === "paused" ||
      hasPrepared === true
        ? AMY_CTA.CONTINUE_PLAN
        : AMY_CTA.START_PLAN;
    return {
      primary: primaryFinal,
      secondary,
      passive,
      action,
      journey: AMY_JOURNEY.COACH_LONG_TERM,
      cta,
      confidence: "HIGH",
      extraReasons: [
        AMY_REASON.BUDGET_HERO,
        AMY_REASON.BUDGET_SECONDARY,
        ...(passive ? [AMY_REASON.BUDGET_PASSIVE] : []),
      ],
      steps,
    };
  }

  if (hasChallenge && !speechConcern) {
    const primary = policy.heroPriority.includes(coachId) ? coachId : wedge;
    const secondary = firstOf(policy.secondaryPriority, new Set([primary]));
    const passive = firstOf(
      policy.passivePriority,
      new Set([primary, secondary].filter(Boolean) as AmyExperienceId[]),
    );
    pushStep(
      "challenge_fit",
      "current_child_challenge",
      primary,
      [...policy.heroPriority.filter((id) => id !== primary)],
      [AMY_REASON.CHALLENGE_PRESENT],
      policy.reasonWeights[AMY_REASON.CHALLENGE_PRESENT] ?? 70,
    );
    return {
      primary,
      secondary,
      passive,
      action: AMY_ACTION.START_COACH,
      journey: AMY_JOURNEY.COACH_LONG_TERM,
      cta: AMY_CTA.START_PLAN,
      confidence: "MEDIUM",
      extraReasons: [
        AMY_REASON.BUDGET_HERO,
        AMY_REASON.BUDGET_SECONDARY,
        ...(passive ? [AMY_REASON.BUDGET_PASSIVE] : []),
      ],
      steps,
    };
  }

  if (speechConcern) {
    const primary = policy.heroPriority.includes(guideId) ? guideId : wedge;
    const secondary = firstOf(policy.secondaryPriority, new Set([primary]));
    pushStep(
      "speech_after_mission",
      "speech_wedge",
      primary,
      [...policy.heroPriority.filter((id) => id !== primary)],
      [AMY_REASON.SPEECH_CONCERN],
      policy.reasonWeights[AMY_REASON.SPEECH_CONCERN] ?? 65,
    );
    return {
      primary,
      secondary,
      passive: null,
      action: AMY_ACTION.OPEN_GUIDE,
      journey: AMY_JOURNEY.GUIDE_IMMEDIATE,
      cta: AMY_CTA.ASK_AMY_NOW,
      confidence: "MEDIUM",
      extraReasons: [AMY_REASON.BUDGET_HERO, AMY_REASON.BUDGET_SECONDARY],
      steps,
    };
  }

  const primary = policy.heroPriority.includes(guideId) ? guideId : wedge;
  const secondaryFinal =
    firstOf(
      policy.secondaryPriority.includes(treasuryId)
        ? [treasuryId, ...policy.secondaryPriority]
        : policy.secondaryPriority,
      new Set([primary]),
    ) ?? null;
  pushStep(
    "no_challenge",
    "current_child_challenge",
    primary,
    [...policy.heroPriority.filter((id) => id !== primary)],
    [AMY_REASON.NO_CHALLENGE],
    policy.reasonWeights[AMY_REASON.NO_CHALLENGE] ?? 40,
  );
  return {
    primary,
    secondary: secondaryFinal,
    passive: null,
    action: AMY_ACTION.OPEN_GUIDE,
    journey: AMY_JOURNEY.GUIDE_IMMEDIATE,
    cta: AMY_CTA.ASK_AMY_NOW,
    confidence: "LOW",
    extraReasons: [AMY_REASON.BUDGET_HERO, AMY_REASON.BUDGET_SECONDARY],
    steps,
  };
}

function uniqueReasons(codes: AmyReasonCode[]): AmyReasonCode[] {
  const seen = new Set<AmyReasonCode>();
  const out: AmyReasonCode[] = [];
  for (const c of codes) {
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

function buildRefs(
  primary: AmyExperienceId,
  secondary: AmyExperienceId | null,
  passive: AmyExperienceId | null,
): {
  toolIds: string[];
  featureIds: string[];
  routeIds: string[];
  unknownIds: string[];
} {
  const ids = [primary, secondary, passive].filter(
    (x): x is AmyExperienceId => x != null,
  );
  const toolIds: string[] = [];
  const featureIds: string[] = [];
  const routeIds: string[] = [];
  const unknownIds: string[] = [];
  for (const id of ids) {
    const refs = AMY_EXPERIENCE_REFS[id];
    if (!refs) {
      unknownIds.push(id);
      continue;
    }
    for (const t of refs.toolIds) toolIds.push(t);
    for (const f of refs.featureIds) featureIds.push(f);
    for (const r of refs.routeIds) routeIds.push(r);
  }
  return { toolIds, featureIds, routeIds, unknownIds };
}

function evaluate(
  context: AmyContext,
  policy: AmyDecisionPolicy,
  now: Date,
): { decision: AmyDecision; plan: SlotPlan; unknownCaps: string[] } {
  const unknownCaps = detectUnknownCapabilities(context);
  const policyOk = validateAmyDecisionPolicy(policy).ok;

  const plan = policyOk
    ? planSlots(context, policy)
    : ({
        primary: AMY_EXPERIENCE.ASK_AMY,
        secondary: AMY_EXPERIENCE.FOR_CHILD,
        passive: null,
        action: AMY_ACTION.WAIT,
        journey: AMY_JOURNEY.NONE,
        cta: AMY_CTA.NONE,
        confidence: "UNKNOWN" as const,
        extraReasons: [AMY_REASON.UNKNOWN_CAPABILITY],
        steps: [
          {
            stepId: "invalid_policy",
            principle: "safety_placeholder",
            selected: AMY_EXPERIENCE.ASK_AMY,
            rejected: [...(policy.heroPriority ?? [])],
            reasonCodes: [AMY_REASON.UNKNOWN_CAPABILITY],
            weight: 50,
          },
        ],
      } satisfies SlotPlan);

  const refs = buildRefs(plan.primary, plan.secondary, plan.passive);
  const reasonCodes = sortReasonCodes(
    uniqueReasons([
      ...collectBaseReasons(context, unknownCaps),
      ...plan.extraReasons,
      ...(refs.unknownIds.length > 0 ? [AMY_REASON.UNKNOWN_CAPABILITY] : []),
    ]),
    policy.reasonWeights ?? {},
  );

  const decisionId = `dec_${fnv1a(
    [
      context.meta.contextVersion,
      policy.policyId,
      policy.policyVersion,
      plan.primary,
      plan.secondary ?? "",
      plan.passive ?? "",
      reasonCodes.join(","),
      plan.action,
      plan.confidence,
    ].join("|"),
  )}`;

  const decision = freezeDeep({
    decisionId,
    decisionVersion: AMY_DECISION_VERSION,
    policyVersion: policy.policyVersion,
    policyId: policy.policyId,
    generatedAt: now.toISOString(),
    contextVersion: context.meta.contextVersion,
    confidence: plan.confidence,
    reasonCodes,
    primaryExperience: ref(plan.primary),
    secondaryExperience: plan.secondary ? ref(plan.secondary) : null,
    passiveExperience: plan.passive ? ref(plan.passive) : null,
    recommendedAction: plan.action,
    recommendedJourney: plan.journey,
    recommendedCTA: plan.cta,
    recommendedToolIds: refs.toolIds,
    recommendedFeatureIds: refs.featureIds,
    recommendedRouteIds: refs.routeIds,
    state: "computed",
  } satisfies AmyDecision);

  return { decision, plan, unknownCaps };
}

/** Create a deterministic AmyDecision from AmyContext. */
export function createAmyDecision(
  context: AmyContext,
  options: CreateAmyDecisionOptions = {},
): AmyDecision {
  const now = options.now ?? new Date();
  const policy = options.policy ?? MVP_SPEECH_WEDGE_POLICY;
  return evaluate(context, policy, now).decision;
}

/**
 * Developer/QA only — Decision + machine-readable Trace.
 * Never for users. Never for AI.
 */
export function createAmyDecisionWithTrace(
  context: AmyContext,
  options: CreateAmyDecisionOptions = {},
): CreateAmyDecisionResult {
  const now = options.now ?? new Date();
  const policy = options.policy ?? MVP_SPEECH_WEDGE_POLICY;
  const { decision, plan, unknownCaps } = evaluate(context, policy, now);
  const trace: AmyDecisionTrace = freezeDeep({
    kind: "amy_decision_trace.v1",
    policyId: policy.policyId,
    policyVersion: policy.policyVersion,
    contextVersion: context.meta.contextVersion,
    decisionId: decision.decisionId,
    steps: plan.steps,
    slotResolution: {
      primary: plan.primary,
      secondary: plan.secondary,
      passive: plan.passive,
    },
    unknownCapabilities: unknownCaps,
  });
  return freezeDeep({ decision, trace });
}
