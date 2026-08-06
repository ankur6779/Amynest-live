import { isV2FlagEnabled } from "@/lib/feature-flags";

/** Attention Budget kill switch — default OFF. */
export function isAmyAttentionBudgetEnabled(): boolean {
  return isV2FlagEnabled("amy_attention_budget_v2");
}
