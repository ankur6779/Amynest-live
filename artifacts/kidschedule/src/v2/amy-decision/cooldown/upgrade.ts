/**
 * Schema migration for Decision Cooldown documents.
 */

import { freezeDeep } from "../freeze";
import { createEmptyCooldownDocument } from "./empty";
import {
  AMY_DECISION_COOLDOWN_VERSION,
  type DecisionCooldownDocument,
  type DecisionCooldownEntry,
} from "./types";

function migrateEntry(raw: unknown): DecisionCooldownEntry | null {
  if (!raw || typeof raw !== "object" || !("experienceId" in raw)) return null;
  const e = JSON.parse(JSON.stringify(raw)) as DecisionCooldownEntry;
  return freezeDeep({
    experienceId: e.experienceId,
    cooldownPolicy: e.cooldownPolicy,
    startedAt: e.startedAt,
    expiresAt: e.expiresAt ?? null,
    dismissCount: typeof e.dismissCount === "number" ? e.dismissCount : 1,
    boundChallengeKey: e.boundChallengeKey ?? null,
    boundMissionKey: e.boundMissionKey ?? null,
    boundCoachStatus: e.boundCoachStatus ?? null,
    cooldownReason: e.cooldownReason ?? "DISMISSED",
    cooldownVersion: AMY_DECISION_COOLDOWN_VERSION,
  });
}

export function upgradeCooldownDocument(
  raw: unknown,
  now: Date = new Date(),
): DecisionCooldownDocument | null {
  if (raw == null) return createEmptyCooldownDocument(now);
  if (typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;
  const schemaVersion =
    typeof obj.schemaVersion === "string"
      ? obj.schemaVersion
      : AMY_DECISION_COOLDOWN_VERSION;

  if (
    schemaVersion !== AMY_DECISION_COOLDOWN_VERSION &&
    !schemaVersion.startsWith("amy_decision_cooldown.")
  ) {
    return null;
  }

  const entriesRaw = Array.isArray(obj.entries) ? obj.entries : [];
  const entries = entriesRaw
    .map(migrateEntry)
    .filter((e): e is DecisionCooldownEntry => e != null);

  return freezeDeep({
    schemaVersion: AMY_DECISION_COOLDOWN_VERSION,
    entries: Object.freeze(entries),
    updatedAt:
      typeof obj.updatedAt === "string" ? obj.updatedAt : now.toISOString(),
  });
}
