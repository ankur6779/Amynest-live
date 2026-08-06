import { allocateAttentionBudget } from "./allocate";
import type {
  AllocateAttentionBudgetInput,
  AllocateAttentionBudgetOptions,
  AttentionAllocationExplanation,
} from "./types";

/**
 * Machine-readable allocation explanation.
 * Developer / QA only — not for AI or users.
 */
export function explainAttentionAllocation(
  input: AllocateAttentionBudgetInput,
  options: AllocateAttentionBudgetOptions = {},
): AttentionAllocationExplanation {
  const budget = allocateAttentionBudget(input, options);
  return Object.freeze({
    budgetState: budget.budgetState,
    heroExperienceId: budget.heroExperience?.experienceId ?? null,
    secondaryExperienceId: budget.secondaryExperience?.experienceId ?? null,
    passiveExperienceId: budget.passiveExperience?.experienceId ?? null,
    suppressedCount: budget.suppressedExperiences.length,
    promotedHero: budget.heroExperience?.promoted ?? false,
    promotedSecondary: budget.secondaryExperience?.promoted ?? false,
    allocationReasonCodes: budget.allocationReasonCodes,
    suppressed: budget.suppressedExperiences,
    allocationTrace: budget.allocationTrace,
    attentionCoverage: budget.attentionCoverage,
  });
}
