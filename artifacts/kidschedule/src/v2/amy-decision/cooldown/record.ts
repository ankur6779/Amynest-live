/**
 * recordCooldownDismissal — pure store update on parent dismiss.
 */

import { freezeDeep } from "../freeze";
import { createEmptyCooldownDocument } from "./empty";
import { computeExpiresAt } from "./policy";
import { resultFromEntry } from "./result";
import {
  AMY_DECISION_COOLDOWN_VERSION,
  type DecisionCooldownDocument,
  type DecisionCooldownEntry,
  type RecordCooldownDismissalInput,
  type RecordCooldownDismissalOptions,
  type RecordCooldownDismissalResult,
} from "./types";

function cloneEntries(
  entries: ReadonlyArray<DecisionCooldownEntry>,
): DecisionCooldownEntry[] {
  return entries.map(
    (e) =>
      freezeDeep(
        JSON.parse(JSON.stringify(e)) as DecisionCooldownEntry,
      ) as DecisionCooldownEntry,
  );
}

/**
 * Record a Hero / experience dismissal.
 * Duplicate dismissal increments dismissCount; expiresAt refreshes for time policies.
 */
export function recordCooldownDismissal(
  input: RecordCooldownDismissalInput,
  options: RecordCooldownDismissalOptions = {},
): RecordCooldownDismissalResult {
  const now = options.now ?? new Date();
  const startedAt = now.toISOString();
  const base = input.store ?? createEmptyCooldownDocument(now);
  const existing = base.entries.find(
    (e) => e.experienceId === input.experienceId,
  );
  const duplicate = Boolean(existing);
  const dismissCount = (existing?.dismissCount ?? 0) + 1;

  const entry = freezeDeep({
    experienceId: input.experienceId,
    cooldownPolicy: input.policy,
    startedAt: duplicate ? existing!.startedAt : startedAt,
    expiresAt: computeExpiresAt(input.policy, input.facts),
    dismissCount,
    boundChallengeKey: input.facts.challengeKey,
    boundMissionKey: input.facts.missionKey,
    boundCoachStatus: input.facts.coachStatus,
    cooldownReason: duplicate
      ? "DUPLICATE_DISMISSAL"
      : (input.reason ?? "DISMISSED"),
    cooldownVersion: AMY_DECISION_COOLDOWN_VERSION,
  }) as DecisionCooldownEntry;

  const nextEntries = cloneEntries(
    base.entries.filter((e) => e.experienceId !== input.experienceId),
  );
  nextEntries.push(entry);

  const store = freezeDeep({
    schemaVersion: AMY_DECISION_COOLDOWN_VERSION,
    entries: Object.freeze(nextEntries),
    updatedAt: startedAt,
  }) as DecisionCooldownDocument;

  // Evaluation state/eligibility; preserve write reason (DISMISSED / DUPLICATE_DISMISSAL).
  const evaluated = resultFromEntry(entry, input.facts, now);
  const result = freezeDeep({
    ...evaluated,
    cooldownReason: entry.cooldownReason,
  });

  return freezeDeep({
    entry,
    store,
    result,
    duplicate,
  });
}
