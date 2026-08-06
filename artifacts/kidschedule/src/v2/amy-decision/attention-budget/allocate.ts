/**
 * allocateAttentionBudget — pure allocation engine.
 * Max 1 Hero · 1 Secondary · 1 Passive. Everything else suppressed.
 * Never mutates Decision / Cooldown / History / Context / Memory.
 */

import { freezeDeep } from "../freeze";
import type { DecisionCooldownResult } from "../cooldown/types";
import type { AmyDecision } from "../types";
import { computeAttentionCoverage } from "./coverage";
import {
  AMY_ATTENTION_BUDGET_VERSION,
  type AllocateAttentionBudgetInput,
  type AllocateAttentionBudgetOptions,
  type AttentionAllocationTrace,
  type AttentionAllocationTraceStep,
  type AttentionBudgetExperienceRef,
  type AttentionBudgetReasonCode,
  type AttentionBudgetResult,
  type AttentionBudgetSlot,
  type AttentionBudgetState,
  type SuppressedExperience,
} from "./types";

type Candidate = {
  experienceId: string;
  sourceSlot: AttentionBudgetSlot;
};

function collectCandidates(decision: AmyDecision): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();

  const push = (
    experienceId: string | undefined | null,
    sourceSlot: AttentionBudgetSlot,
  ) => {
    if (!experienceId || seen.has(experienceId)) return;
    seen.add(experienceId);
    out.push({ experienceId, sourceSlot });
  };

  push(decision.primaryExperience.experienceId, "hero");
  push(decision.secondaryExperience?.experienceId ?? null, "secondary");
  push(decision.passiveExperience?.experienceId ?? null, "passive");
  return out;
}

function cooldownMap(
  primary: DecisionCooldownResult,
  additional?: ReadonlyArray<DecisionCooldownResult>,
): Map<string, DecisionCooldownResult> {
  const map = new Map<string, DecisionCooldownResult>();
  map.set(primary.experienceId, primary);
  for (const c of additional ?? []) {
    map.set(c.experienceId, c);
  }
  return map;
}

function isCooldownBlocking(c: DecisionCooldownResult | undefined): boolean {
  if (!c) return false;
  return c.cooldownState === "ACTIVE" || c.cooldownState === "PERMANENT";
}

function suppressionReasonsFor(
  experienceId: string,
  input: AllocateAttentionBudgetInput,
  cooldowns: Map<string, DecisionCooldownResult>,
): AttentionBudgetReasonCode[] | null {
  const reasons: AttentionBudgetReasonCode[] = [];
  const r = input.restrictions;

  if (r?.safetyBlockedExperienceIds?.includes(experienceId)) {
    reasons.push("SUPPRESSED_SAFETY");
  }
  if (r?.premiumLockedExperienceIds?.includes(experienceId)) {
    reasons.push("SUPPRESSED_PREMIUM");
  }
  if (r?.unavailableExperienceIds?.includes(experienceId)) {
    reasons.push("SUPPRESSED_CAPABILITY");
  }
  if (r?.policyBlockedExperienceIds?.includes(experienceId)) {
    reasons.push("SUPPRESSED_POLICY");
  }
  if (isCooldownBlocking(cooldowns.get(experienceId))) {
    reasons.push("SUPPRESSED_COOLDOWN");
  }

  return reasons.length > 0 ? reasons : null;
}

function budgetStateOf(
  hero: AttentionBudgetExperienceRef | null,
  secondary: AttentionBudgetExperienceRef | null,
  passive: AttentionBudgetExperienceRef | null,
  decision: AmyDecision,
): AttentionBudgetState {
  if (!hero && !secondary && !passive) return "EMPTY";
  if (!hero) return "PARTIAL";

  const wantedSecondary = decision.secondaryExperience != null;
  const wantedPassive = decision.passiveExperience != null;
  const secondaryOk = !wantedSecondary || secondary != null;
  const passiveOk = !wantedPassive || passive != null;

  if (secondaryOk && passiveOk) return "VALID";
  return "PARTIAL";
}

function buildTrace(
  candidates: Candidate[],
  suppressed: ReadonlyArray<SuppressedExperience>,
  hero: AttentionBudgetExperienceRef | null,
  secondary: AttentionBudgetExperienceRef | null,
  passive: AttentionBudgetExperienceRef | null,
): AttentionAllocationTrace {
  const suppressedById = new Map(
    suppressed.map((s) => [s.experienceId, s] as const),
  );

  const allocatedById = new Map<
    string,
    { slot: AttentionBudgetSlot; promoted: boolean; reason: AttentionBudgetReasonCode }
  >();
  if (hero) {
    allocatedById.set(hero.experienceId, {
      slot: "hero",
      promoted: hero.promoted,
      reason: hero.promoted ? "PROMOTED_TO_HERO" : "ALLOCATED_HERO",
    });
  }
  if (secondary) {
    allocatedById.set(secondary.experienceId, {
      slot: "secondary",
      promoted: secondary.promoted,
      reason: secondary.promoted
        ? "PROMOTED_TO_SECONDARY"
        : "ALLOCATED_SECONDARY",
    });
  }
  if (passive) {
    allocatedById.set(passive.experienceId, {
      slot: "passive",
      promoted: passive.promoted,
      reason: "ALLOCATED_PASSIVE",
    });
  }

  const steps: AttentionAllocationTraceStep[] = candidates.map((candidate) => {
    const blocked = suppressedById.get(candidate.experienceId);
    if (blocked) {
      return freezeDeep({
        experienceId: candidate.experienceId,
        sourceSlot: candidate.sourceSlot,
        eligibility: "SUPPRESSED",
        allocatedSlot: null,
        promoted: false,
        reasonCodes: blocked.reasonCodes,
      });
    }
    const allocated = allocatedById.get(candidate.experienceId);
    if (allocated) {
      return freezeDeep({
        experienceId: candidate.experienceId,
        sourceSlot: candidate.sourceSlot,
        eligibility: "ELIGIBLE",
        allocatedSlot: allocated.slot,
        promoted: allocated.promoted,
        reasonCodes: Object.freeze([allocated.reason]),
      });
    }
    return freezeDeep({
      experienceId: candidate.experienceId,
      sourceSlot: candidate.sourceSlot,
      eligibility: "ELIGIBLE",
      allocatedSlot: null,
      promoted: false,
      reasonCodes: Object.freeze([
        "SUPPRESSED_LOWER_PRIORITY" as AttentionBudgetReasonCode,
      ]),
    });
  });

  return freezeDeep({
    kind: "amy_attention_allocation_trace.v1",
    steps: Object.freeze(steps),
  });
}

/**
 * Allocate attention slots from Stable Decision + Cooldown eligibility.
 */
export function allocateAttentionBudget(
  input: AllocateAttentionBudgetInput,
  options: AllocateAttentionBudgetOptions = {},
): AttentionBudgetResult {
  const now = options.now ?? new Date();
  const generatedAt = now.toISOString();
  const decision = input.stable.decision;
  const candidates = collectCandidates(decision);
  const cooldowns = cooldownMap(input.cooldown, input.additionalCooldowns);

  const allocationReasonCodes: AttentionBudgetReasonCode[] = [];
  const suppressed: SuppressedExperience[] = [];
  const available: Candidate[] = [];

  if (decision.reasonCodes.includes("GUEST_USER")) {
    allocationReasonCodes.push("GUEST_MODE");
  }
  if (decision.reasonCodes.includes("SIGNED_IN")) {
    allocationReasonCodes.push("SIGNED_IN");
  }
  if (decision.reasonCodes.includes("UNKNOWN_CAPABILITY")) {
    allocationReasonCodes.push("SUPPRESSED_UNKNOWN_CAPABILITY");
  }

  for (const candidate of candidates) {
    const blocked = suppressionReasonsFor(
      candidate.experienceId,
      input,
      cooldowns,
    );
    if (blocked) {
      suppressed.push(
        freezeDeep({
          experienceId: candidate.experienceId,
          sourceSlot: candidate.sourceSlot,
          reasonCodes: Object.freeze([...blocked]),
        }),
      );
    } else {
      available.push(candidate);
    }
  }

  let hero: AttentionBudgetExperienceRef | null = null;
  let secondary: AttentionBudgetExperienceRef | null = null;
  let passive: AttentionBudgetExperienceRef | null = null;

  const take = (
    candidate: Candidate | undefined,
    target: AttentionBudgetSlot,
  ): AttentionBudgetExperienceRef | null => {
    if (!candidate) return null;
    const promoted = candidate.sourceSlot !== target;
    if (target === "hero") {
      allocationReasonCodes.push(
        promoted ? "PROMOTED_TO_HERO" : "ALLOCATED_HERO",
      );
    } else if (target === "secondary") {
      allocationReasonCodes.push(
        promoted ? "PROMOTED_TO_SECONDARY" : "ALLOCATED_SECONDARY",
      );
    } else {
      allocationReasonCodes.push("ALLOCATED_PASSIVE");
    }
    return freezeDeep({
      experienceId: candidate.experienceId,
      sourceSlot: candidate.sourceSlot,
      promoted,
    });
  };

  const queue = [...available];
  hero = take(queue.shift(), "hero");
  secondary = take(queue.shift(), "secondary");
  passive = take(queue.shift(), "passive");

  for (const leftover of queue) {
    suppressed.push(
      freezeDeep({
        experienceId: leftover.experienceId,
        sourceSlot: leftover.sourceSlot,
        reasonCodes: Object.freeze([
          "SUPPRESSED_LOWER_PRIORITY" as AttentionBudgetReasonCode,
        ]),
      }),
    );
  }

  if (candidates.length === 0) {
    allocationReasonCodes.push("NO_CANDIDATES");
  }

  const state = budgetStateOf(hero, secondary, passive, decision);
  const allocationTrace = buildTrace(
    candidates,
    suppressed,
    hero,
    secondary,
    passive,
  );
  const coverage = computeAttentionCoverage({
    heroExperience: hero,
    secondaryExperience: secondary,
    passiveExperience: passive,
  });

  return freezeDeep({
    heroExperience: hero,
    secondaryExperience: secondary,
    passiveExperience: passive,
    suppressedExperiences: Object.freeze(suppressed),
    budgetState: state,
    budgetVersion: AMY_ATTENTION_BUDGET_VERSION,
    allocationReasonCodes: Object.freeze([...allocationReasonCodes]),
    generatedAt,
    allocationTrace,
    attentionCoverage: coverage,
  });
}
