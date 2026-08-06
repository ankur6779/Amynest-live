/**
 * Developer helpers over the Cooldown store.
 */

import { evaluateDecisionCooldown } from "./evaluate";
import { resultFromEntry } from "./result";
import {
  getDefaultCooldownAdapter,
  type DecisionCooldownStorageAdapter,
} from "./store";
import type {
  DecisionCooldownDocument,
  DecisionCooldownFacts,
  DecisionCooldownResult,
  EvaluateDecisionCooldownInput,
} from "./types";
import { createEmptyCooldownDocument } from "./empty";

function adapterOrDefault(
  adapter?: DecisionCooldownStorageAdapter | null,
): DecisionCooldownStorageAdapter {
  return adapter ?? getDefaultCooldownAdapter();
}

/** Readonly store snapshot. */
export function getCooldownSnapshot(
  adapter?: DecisionCooldownStorageAdapter | null,
): DecisionCooldownDocument {
  return adapterOrDefault(adapter).readDocument();
}

/**
 * Active (or permanent) cooldowns evaluated against facts.
 * Readonly results — store not mutated.
 */
export function getActiveCooldowns(
  facts: DecisionCooldownFacts,
  options: {
    now?: Date;
    adapter?: DecisionCooldownStorageAdapter | null;
  } = {},
): ReadonlyArray<DecisionCooldownResult> {
  const now = options.now ?? new Date();
  const store = adapterOrDefault(options.adapter).readDocument();
  const active: DecisionCooldownResult[] = [];
  for (const entry of store.entries) {
    const result = resultFromEntry(entry, facts, now);
    if (result.cooldownState === "ACTIVE" || result.cooldownState === "PERMANENT") {
      active.push(result);
    }
  }
  return Object.freeze(active);
}

export function hasActiveCooldown(
  experienceId: string,
  facts: DecisionCooldownFacts,
  options: {
    now?: Date;
    adapter?: DecisionCooldownStorageAdapter | null;
    /** Minimal stable shim when calling evaluate path */
    stable?: EvaluateDecisionCooldownInput["stable"];
    history?: EvaluateDecisionCooldownInput["history"];
  } = {},
): boolean {
  const store = adapterOrDefault(options.adapter).readDocument();
  if (options.stable) {
    const result = evaluateDecisionCooldown(
      {
        stable: options.stable,
        history: options.history ?? null,
        store,
        facts,
      },
      { now: options.now, experienceId },
    );
    return (
      result.cooldownState === "ACTIVE" || result.cooldownState === "PERMANENT"
    );
  }
  const entry = store.entries.find((e) => e.experienceId === experienceId);
  if (!entry) return false;
  const result = resultFromEntry(entry, facts, options.now ?? new Date());
  return (
    result.cooldownState === "ACTIVE" || result.cooldownState === "PERMANENT"
  );
}

export function resetCooldownStoreForTests(
  adapter?: DecisionCooldownStorageAdapter | null,
): void {
  const store = adapterOrDefault(adapter);
  store.writeDocument(createEmptyCooldownDocument());
}
