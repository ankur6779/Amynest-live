import { afterEach, describe, expect, it, vi } from "vitest";
import { isV2FlagEnabled } from "@/lib/feature-flags";
import { resolveAmyContext, type AmyContext } from "@/v2/amy-context";
import {
  clearAmyMemoryForTests,
  createEmptyAmyMemory,
  type AmyMemoryDocument,
  type AmyMemoryMutable,
} from "@/v2/amy-memory";
import { computeContextVersion } from "@/v2/amy-memory/context-version";
import {
  AMY_DECISION_COOLDOWN_VERSION,
  AMY_EXPERIENCE,
  createAmyDecision,
  createEmptyCooldownDocument,
  evaluateDecisionCooldown,
  recordCooldownDismissal,
  stabilizeAmyDecision,
  type DecisionCooldownResult,
  localDateKeyFromDate,
} from "../index";
import {
  allocateAttentionBudget,
  attentionCoverage,
  clearAttentionBudgetSnapshotForTests,
  compareAttentionBudgets,
  explainAttentionAllocation,
  getAttentionBudgetSnapshot,
  hasHero,
  hasPassive,
  hasSecondary,
  isAmyAttentionBudgetEnabled,
  rememberAttentionBudgetSnapshot,
  validateAttentionBudget,
} from "./index";

function freezeDoc(doc: AmyMemoryMutable): AmyMemoryDocument {
  doc.contextVersion = computeContextVersion(doc as AmyMemoryDocument);
  return Object.freeze(
    JSON.parse(JSON.stringify(doc)),
  ) as AmyMemoryDocument;
}

function contextFrom(
  mutate?: (doc: AmyMemoryMutable) => void,
  now = new Date(2026, 7, 2, 12, 0, 0),
): AmyContext {
  const doc = createEmptyAmyMemory({ guestId: "ab-guest-1" });
  mutate?.(doc);
  return resolveAmyContext(freezeDoc(doc), { now });
}

const FIXED_NOW = new Date(2026, 7, 2, 12, 0, 0);

function localDateKey(now: Date): string {
  return localDateKeyFromDate(now);
}

function noneCooldown(experienceId: string): DecisionCooldownResult {
  return Object.freeze({
    experienceId,
    cooldownState: "NONE",
    cooldownPolicy: null,
    startedAt: null,
    expiresAt: null,
    dismissCount: 0,
    eligibleAgain: true,
    cooldownReason: "NO_COOLDOWN",
    cooldownVersion: AMY_DECISION_COOLDOWN_VERSION,
  });
}

function activeCooldown(experienceId: string): DecisionCooldownResult {
  return Object.freeze({
    experienceId,
    cooldownState: "ACTIVE",
    cooldownPolicy: "UNTIL_END_OF_DAY",
    startedAt: FIXED_NOW.toISOString(),
    expiresAt: new Date(2026, 7, 2, 23, 59, 59, 999).toISOString(),
    dismissCount: 1,
    eligibleAgain: false,
    cooldownReason: "DISMISSED",
    cooldownVersion: AMY_DECISION_COOLDOWN_VERSION,
  });
}

function missionCompleteStable() {
  const day = localDateKey(FIXED_NOW);
  const ctx = contextFrom((d) => {
    d.challenge.worryId = "behavior";
    d.mission.missionId = "speech_name_three";
    d.mission.dateKey = day;
    d.mission.completedAt = FIXED_NOW.toISOString();
    d.speech.todayMissionStatus = "completed";
    d.coach.status = "prepared";
    d.coach.prepared = {
      goalId: "toddler-tantrums",
      goalTitle: "Toddler Tantrums",
      categoryId: "toddler-behavior",
      worryId: "behavior",
      challengeLabel: "Behaviour",
      preparedAt: FIXED_NOW.toISOString(),
      gateDismissed: false,
    };
  });
  const decision = createAmyDecision(ctx, { now: FIXED_NOW });
  const stable = stabilizeAmyDecision(
    { context: ctx, currentDecision: decision },
    { now: FIXED_NOW },
  );
  return { ctx, decision, stable };
}

function incompleteMissionStable() {
  const ctx = contextFrom((d) => {
    d.challenge.worryId = "behavior";
  });
  const decision = createAmyDecision(ctx, { now: FIXED_NOW });
  const stable = stabilizeAmyDecision(
    { context: ctx, currentDecision: decision },
    { now: FIXED_NOW },
  );
  return { ctx, decision, stable };
}

describe("Attention Budget Engine (Sprint A7)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearAmyMemoryForTests();
    clearAttentionBudgetSnapshotForTests();
    localStorage.clear();
  });

  it("feature flag defaults OFF", () => {
    expect(isV2FlagEnabled("amy_attention_budget_v2")).toBe(false);
    expect(isAmyAttentionBudgetEnabled()).toBe(false);
  });

  it("normal allocation — Hero / Secondary / Passive", () => {
    const { stable, decision } = missionCompleteStable();
    expect(decision.primaryExperience.experienceId).toBe(AMY_EXPERIENCE.AMY_COACH);
    expect(decision.secondaryExperience?.experienceId).toBe(AMY_EXPERIENCE.ASK_AMY);
    expect(decision.passiveExperience?.experienceId).toBe(AMY_EXPERIENCE.FOR_CHILD);

    const budget = allocateAttentionBudget(
      {
        stable,
        cooldown: noneCooldown(decision.primaryExperience.experienceId),
      },
      { now: FIXED_NOW },
    );

    expect(budget.budgetState).toBe("VALID");
    expect(budget.heroExperience?.experienceId).toBe(AMY_EXPERIENCE.AMY_COACH);
    expect(budget.secondaryExperience?.experienceId).toBe(AMY_EXPERIENCE.ASK_AMY);
    expect(budget.passiveExperience?.experienceId).toBe(AMY_EXPERIENCE.FOR_CHILD);
    expect(budget.heroExperience?.promoted).toBe(false);
    expect(budget.suppressedExperiences).toHaveLength(0);
    expect(budget.attentionCoverage).toBe(1);
    expect(attentionCoverage(budget)).toBe(1);
    expect(budget.allocationTrace.kind).toBe("amy_attention_allocation_trace.v1");
    expect(budget.allocationTrace.steps).toHaveLength(3);
    expect(budget.allocationTrace.steps[0]).toMatchObject({
      experienceId: AMY_EXPERIENCE.AMY_COACH,
      eligibility: "ELIGIBLE",
      allocatedSlot: "hero",
      promoted: false,
    });
    expect(budget.allocationTrace.steps[1]).toMatchObject({
      experienceId: AMY_EXPERIENCE.ASK_AMY,
      allocatedSlot: "secondary",
    });
    expect(budget.allocationTrace.steps[2]).toMatchObject({
      experienceId: AMY_EXPERIENCE.FOR_CHILD,
      allocatedSlot: "passive",
    });
    expect(validateAttentionBudget(budget).ok).toBe(true);
    expect(Object.isFrozen(budget)).toBe(true);
    expect(Object.isFrozen(budget.allocationTrace)).toBe(true);
    expect(hasHero(budget)).toBe(true);
    expect(hasSecondary(budget)).toBe(true);
    expect(hasPassive(budget)).toBe(true);
  });

  it("cooldown Hero → Secondary promoted", () => {
    const { stable, decision } = missionCompleteStable();
    const budget = allocateAttentionBudget(
      {
        stable,
        cooldown: activeCooldown(decision.primaryExperience.experienceId),
      },
      { now: FIXED_NOW },
    );

    expect(budget.heroExperience?.experienceId).toBe(AMY_EXPERIENCE.ASK_AMY);
    expect(budget.heroExperience?.promoted).toBe(true);
    expect(budget.heroExperience?.sourceSlot).toBe("secondary");
    expect(budget.secondaryExperience?.experienceId).toBe(AMY_EXPERIENCE.FOR_CHILD);
    expect(budget.secondaryExperience?.promoted).toBe(true);
    expect(budget.passiveExperience).toBeNull();
    expect(
      budget.suppressedExperiences.some(
        (s) =>
          s.experienceId === AMY_EXPERIENCE.AMY_COACH &&
          s.reasonCodes.includes("SUPPRESSED_COOLDOWN"),
      ),
    ).toBe(true);
    expect(budget.allocationReasonCodes).toContain("PROMOTED_TO_HERO");
    expect(budget.budgetState).toBe("PARTIAL");
    expect(budget.attentionCoverage).toBe(0.6667);
    expect(budget.allocationTrace.steps[0]).toMatchObject({
      experienceId: AMY_EXPERIENCE.AMY_COACH,
      eligibility: "SUPPRESSED",
      allocatedSlot: null,
      reasonCodes: ["SUPPRESSED_COOLDOWN"],
    });
    expect(budget.allocationTrace.steps[1]).toMatchObject({
      experienceId: AMY_EXPERIENCE.ASK_AMY,
      eligibility: "ELIGIBLE",
      allocatedSlot: "hero",
      promoted: true,
    });
    expect(budget.allocationTrace.steps[2]).toMatchObject({
      experienceId: AMY_EXPERIENCE.FOR_CHILD,
      allocatedSlot: "secondary",
      promoted: true,
    });
  });

  it("cooldown Secondary → Passive promoted into secondary", () => {
    const { stable, decision } = missionCompleteStable();
    const budget = allocateAttentionBudget(
      {
        stable,
        cooldown: noneCooldown(decision.primaryExperience.experienceId),
        additionalCooldowns: [activeCooldown(AMY_EXPERIENCE.ASK_AMY)],
      },
      { now: FIXED_NOW },
    );

    expect(budget.heroExperience?.experienceId).toBe(AMY_EXPERIENCE.AMY_COACH);
    expect(budget.secondaryExperience?.experienceId).toBe(AMY_EXPERIENCE.FOR_CHILD);
    expect(budget.secondaryExperience?.promoted).toBe(true);
    expect(budget.passiveExperience).toBeNull();
    expect(budget.allocationReasonCodes).toContain("PROMOTED_TO_SECONDARY");
  });

  it("premium / capability / safety suppression", () => {
    const { stable, decision } = missionCompleteStable();
    const budget = allocateAttentionBudget(
      {
        stable,
        cooldown: noneCooldown(decision.primaryExperience.experienceId),
        restrictions: {
          premiumLockedExperienceIds: [AMY_EXPERIENCE.AMY_COACH],
          unavailableExperienceIds: [AMY_EXPERIENCE.ASK_AMY],
          safetyBlockedExperienceIds: [AMY_EXPERIENCE.FOR_CHILD],
        },
      },
      { now: FIXED_NOW },
    );
    expect(budget.budgetState).toBe("EMPTY");
    expect(budget.heroExperience).toBeNull();
    expect(
      budget.suppressedExperiences.map((s) => s.experienceId).sort(),
    ).toEqual(
      [
        AMY_EXPERIENCE.AMY_COACH,
        AMY_EXPERIENCE.ASK_AMY,
        AMY_EXPERIENCE.FOR_CHILD,
      ].sort(),
    );
  });

  it("guest / signed-in / unknown capability codes", () => {
    const guest = incompleteMissionStable();
    expect(guest.decision.reasonCodes).toContain("GUEST_USER");
    const guestBudget = allocateAttentionBudget(
      {
        stable: guest.stable,
        cooldown: noneCooldown(guest.decision.primaryExperience.experienceId),
      },
      { now: FIXED_NOW },
    );
    expect(guestBudget.allocationReasonCodes).toContain("GUEST_MODE");
    expect(guestBudget.heroExperience?.experienceId).toBe(
      AMY_EXPERIENCE.SPEECH_MISSION,
    );

    const signedCtx = contextFrom((d) => {
      d.identity.mode = "signed_in";
      d.identity.userId = "u1";
      d.challenge.worryId = "behavior";
    });
    const signedDecision = createAmyDecision(signedCtx, { now: FIXED_NOW });
    const signedStable = stabilizeAmyDecision(
      { context: signedCtx, currentDecision: signedDecision },
      { now: FIXED_NOW },
    );
    const signedBudget = allocateAttentionBudget(
      {
        stable: signedStable,
        cooldown: noneCooldown(signedDecision.primaryExperience.experienceId),
      },
      { now: FIXED_NOW },
    );
    expect(signedBudget.allocationReasonCodes).toContain("SIGNED_IN");

    const weird = {
      ...guest.ctx,
      capabilities: {
        ...guest.ctx.capabilities,
        futureModuleReady: true,
      },
    } as typeof guest.ctx;
    const weirdDecision = createAmyDecision(weird, { now: FIXED_NOW });
    const weirdStable = stabilizeAmyDecision(
      { context: weird, currentDecision: weirdDecision },
      { now: FIXED_NOW },
    );
    const weirdBudget = allocateAttentionBudget(
      {
        stable: weirdStable,
        cooldown: noneCooldown(weirdDecision.primaryExperience.experienceId),
      },
      { now: FIXED_NOW },
    );
    expect(weirdBudget.allocationReasonCodes).toContain(
      "SUPPRESSED_UNKNOWN_CAPABILITY",
    );
    // Unknown capability is non-fatal — hero still allocated
    expect(weirdBudget.heroExperience).not.toBeNull();
  });

  it("no duplicate Hero / Secondary", () => {
    const { stable, decision } = missionCompleteStable();
    const budget = allocateAttentionBudget(
      {
        stable,
        cooldown: noneCooldown(decision.primaryExperience.experienceId),
      },
      { now: FIXED_NOW },
    );
    const ids = [
      budget.heroExperience?.experienceId,
      budget.secondaryExperience?.experienceId,
      budget.passiveExperience?.experienceId,
    ].filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
    expect(validateAttentionBudget(budget).ok).toBe(true);
  });

  it("budget empty when all cooled down", () => {
    const { stable, decision } = missionCompleteStable();
    const budget = allocateAttentionBudget(
      {
        stable,
        cooldown: activeCooldown(decision.primaryExperience.experienceId),
        additionalCooldowns: [
          activeCooldown(AMY_EXPERIENCE.ASK_AMY),
          activeCooldown(AMY_EXPERIENCE.FOR_CHILD),
        ],
      },
      { now: FIXED_NOW },
    );
    expect(budget.budgetState).toBe("EMPTY");
    expect(budget.heroExperience).toBeNull();
    expect(budget.secondaryExperience).toBeNull();
    expect(budget.passiveExperience).toBeNull();
    expect(budget.attentionCoverage).toBe(0);
    expect(attentionCoverage(budget)).toBe(0);
    expect(
      budget.allocationTrace.steps.every((s) => s.eligibility === "SUPPRESSED"),
    ).toBe(true);
    expect(validateAttentionBudget(budget).ok).toBe(true);
  });

  it("explain + snapshot helpers + compare", () => {
    const { stable, decision } = missionCompleteStable();
    const input = {
      stable,
      cooldown: activeCooldown(decision.primaryExperience.experienceId),
    };
    const explanation = explainAttentionAllocation(input, { now: FIXED_NOW });
    expect(explanation.promotedHero).toBe(true);
    expect(explanation.heroExperienceId).toBe(AMY_EXPERIENCE.ASK_AMY);

    const a = allocateAttentionBudget(input, { now: FIXED_NOW });
    const b = allocateAttentionBudget(input, {
      now: new Date(FIXED_NOW.getTime() + 1000),
    });
    expect(compareAttentionBudgets(a, b)).toEqual([]);
    rememberAttentionBudgetSnapshot(a);
    expect(getAttentionBudgetSnapshot()?.heroExperience?.experienceId).toBe(
      AMY_EXPERIENCE.ASK_AMY,
    );
  });

  it("never mutates Decision or Cooldown inputs", () => {
    const { stable, decision } = missionCompleteStable();
    const dismissed = recordCooldownDismissal(
      {
        experienceId: decision.primaryExperience.experienceId,
        policy: "UNTIL_END_OF_DAY",
        facts: {
          localDateKey: localDateKey(FIXED_NOW),
          challengeKey: "behavior",
          missionKey: "m",
          coachStatus: "prepared",
        },
        store: createEmptyCooldownDocument(FIXED_NOW),
      },
      { now: FIXED_NOW },
    );
    const cooldown = evaluateDecisionCooldown(
      {
        stable,
        history: null,
        store: dismissed.store,
        facts: {
          localDateKey: localDateKey(FIXED_NOW),
          challengeKey: "behavior",
          missionKey: "m",
          coachStatus: "prepared",
        },
      },
      { now: FIXED_NOW },
    );
    const beforeDecision = JSON.stringify(stable.decision);
    const beforeCooldown = JSON.stringify(cooldown);
    allocateAttentionBudget({ stable, cooldown }, { now: FIXED_NOW });
    expect(JSON.stringify(stable.decision)).toBe(beforeDecision);
    expect(JSON.stringify(cooldown)).toBe(beforeCooldown);
    expect(dismissed.store.entries).toHaveLength(1);
  });
});
