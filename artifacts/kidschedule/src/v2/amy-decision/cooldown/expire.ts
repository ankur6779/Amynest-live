/**
 * expireCooldown / clearCooldown — pure store transforms.
 */

import { freezeDeep } from "../freeze";
import { createEmptyCooldownDocument } from "./empty";
import { resultFromEntry, noneCooldownResult } from "./result";
import {
  AMY_DECISION_COOLDOWN_VERSION,
  type DecisionCooldownDocument,
  type DecisionCooldownEntry,
  type DecisionCooldownFacts,
  type DecisionCooldownResult,
} from "./types";

export type ExpireCooldownResult = Readonly<{
  store: DecisionCooldownDocument;
  result: DecisionCooldownResult;
  expired: boolean;
}>;

export type ClearCooldownResult = Readonly<{
  store: DecisionCooldownDocument;
  cleared: boolean;
}>;

/**
 * Explicitly expire a cooldown (eligibleAgain → true).
 * Permanent hide is not expired unless forcePermanent is set.
 */
export function expireCooldown(
  experienceId: string,
  store: DecisionCooldownDocument,
  facts: DecisionCooldownFacts,
  options: { now?: Date; forcePermanent?: boolean } = {},
): ExpireCooldownResult {
  const now = options.now ?? new Date();
  const existing = store.entries.find((e) => e.experienceId === experienceId);
  if (!existing) {
    return freezeDeep({
      store,
      result: noneCooldownResult(experienceId),
      expired: false,
    });
  }

  if (existing.cooldownPolicy === "PERMANENT_HIDE" && !options.forcePermanent) {
    return freezeDeep({
      store,
      result: resultFromEntry(existing, facts, now),
      expired: false,
    });
  }

  // Remove entry → NONE / eligible. Explicit expire drops the binding.
  const nextEntries = store.entries
    .filter((e) => e.experienceId !== experienceId)
    .map(
      (e) =>
        freezeDeep(
          JSON.parse(JSON.stringify(e)) as DecisionCooldownEntry,
        ) as DecisionCooldownEntry,
    );

  const nextStore = freezeDeep({
    schemaVersion: AMY_DECISION_COOLDOWN_VERSION,
    entries: Object.freeze(nextEntries),
    updatedAt: now.toISOString(),
  }) as DecisionCooldownDocument;

  return freezeDeep({
    store: nextStore,
    result: freezeDeep({
      experienceId,
      cooldownState: "EXPIRED",
      cooldownPolicy: existing.cooldownPolicy,
      startedAt: existing.startedAt,
      expiresAt: existing.expiresAt,
      dismissCount: existing.dismissCount,
      eligibleAgain: true,
      cooldownReason: "EXPLICIT_EXPIRE",
      cooldownVersion: AMY_DECISION_COOLDOWN_VERSION,
    }),
    expired: true,
  });
}

/**
 * Clear one experience cooldown, or all when experienceId is omitted.
 * Permanent hide requires clearPermanent: true to remove.
 */
export function clearCooldown(
  store: DecisionCooldownDocument,
  options: {
    experienceId?: string;
    now?: Date;
    clearPermanent?: boolean;
  } = {},
): ClearCooldownResult {
  const now = options.now ?? new Date();
  if (!options.experienceId) {
    const remaining = options.clearPermanent
      ? []
      : store.entries.filter((e) => e.cooldownPolicy === "PERMANENT_HIDE");
    if (remaining.length === store.entries.length && remaining.length > 0) {
      return freezeDeep({ store, cleared: false });
    }
    if (remaining.length === 0) {
      return freezeDeep({
        store: createEmptyCooldownDocument(now),
        cleared: store.entries.length > 0,
      });
    }
    return freezeDeep({
      store: freezeDeep({
        schemaVersion: AMY_DECISION_COOLDOWN_VERSION,
        entries: Object.freeze(
          remaining.map(
            (e) =>
              freezeDeep(
                JSON.parse(JSON.stringify(e)) as DecisionCooldownEntry,
              ) as DecisionCooldownEntry,
          ),
        ),
        updatedAt: now.toISOString(),
      }) as DecisionCooldownDocument,
      cleared: remaining.length !== store.entries.length,
    });
  }

  const existing = store.entries.find(
    (e) => e.experienceId === options.experienceId,
  );
  if (!existing) {
    return freezeDeep({ store, cleared: false });
  }
  if (existing.cooldownPolicy === "PERMANENT_HIDE" && !options.clearPermanent) {
    return freezeDeep({ store, cleared: false });
  }

  const nextEntries = store.entries
    .filter((e) => e.experienceId !== options.experienceId)
    .map(
      (e) =>
        freezeDeep(
          JSON.parse(JSON.stringify(e)) as DecisionCooldownEntry,
        ) as DecisionCooldownEntry,
    );

  return freezeDeep({
    store: freezeDeep({
      schemaVersion: AMY_DECISION_COOLDOWN_VERSION,
      entries: Object.freeze(nextEntries),
      updatedAt: now.toISOString(),
    }) as DecisionCooldownDocument,
    cleared: true,
  });
}
