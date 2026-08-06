/**
 * getTodayBrainSnapshot — pure shadow read.
 * Observes ResolvedDecision + AttentionBudget + Validation.
 * Never executes Brain. Never renders.
 */

import { AMY_BRAIN_SHADOW_VERSION } from "@/v2/brain-validation/types";
import type { ResolvedSlot } from "@/v2/decision-bridge/types";
import { freezeDeep } from "./freeze";
import { recordTodayBrainShadowRead } from "./health-state";
import {
  AMY_TODAY_BRAIN_ADAPTER_VERSION,
  type TodayBrainResolvedSlot,
  type TodayBrainShadowReadInput,
  type TodayBrainSnapshot,
  type TodayBrainSnapshotOptions,
} from "./types";

function toResolvedSlot(
  slot: ResolvedSlot | null | undefined,
): TodayBrainResolvedSlot | null {
  if (!slot) return null;
  return freezeDeep({
    experienceId: slot.experienceId,
    sourceSlot: slot.sourceSlot,
    promoted: slot.promoted,
    featureIds: Object.freeze(slot.features.map((f) => f.featureId)),
    routeIds: Object.freeze(
      slot.routes.flatMap((r) => [r.path, r.routeId]),
    ),
    toolIds: Object.freeze(slot.tools.map((t) => t.toolId)),
  });
}

function validationPassedOf(
  validation: TodayBrainShadowReadInput["validation"],
): boolean {
  if (!validation) return false;
  return validation.status === "MATCH";
}

/**
 * Build TodayBrainSnapshot from injectable Brain outputs.
 * Missing ResolvedDecision → brainAvailable false (safe unavailable).
 * Budget is observed for presence but slots come from ResolvedDecision
 * (Bridge already applied budget allocation).
 */
export function getTodayBrainSnapshot(
  input: TodayBrainShadowReadInput = {
    resolved: null,
    budget: null,
    validation: null,
  },
  options: TodayBrainSnapshotOptions = {},
): TodayBrainSnapshot {
  const now = options.now ?? new Date();
  const generatedAt = now.toISOString();
  const resolved = input.resolved;
  const budget = input.budget;
  const validation = input.validation;
  // Shadow read requires ResolvedDecision + AttentionBudget. Validation optional.
  const brainAvailable = Boolean(resolved) && Boolean(budget);

  // Observe budget slots (machine only) — UI never reads these.
  void budget?.heroExperience;
  void budget?.secondaryExperience;
  void budget?.passiveExperience;
  void budget?.suppressedExperiences;

  const snapshot = freezeDeep({
    brainAvailable,
    validationPassed: brainAvailable && validationPassedOf(validation),
    resolvedHero: brainAvailable ? toResolvedSlot(resolved?.hero) : null,
    resolvedSecondary: brainAvailable
      ? toResolvedSlot(resolved?.secondary)
      : null,
    resolvedPassive: brainAvailable
      ? toResolvedSlot(resolved?.passive)
      : null,
    brainVersion: brainAvailable
      ? (validation?.brainVersion ?? AMY_BRAIN_SHADOW_VERSION)
      : null,
    validationVersion: validation?.validationVersion ?? null,
    generatedAt,
    adapterVersion: AMY_TODAY_BRAIN_ADAPTER_VERSION,
    validationStatus: validation?.status ?? "UNAVAILABLE",
  }) satisfies TodayBrainSnapshot;

  if (options.recordShadowRead ?? true) {
    recordTodayBrainShadowRead(snapshot);
  }

  return snapshot;
}
