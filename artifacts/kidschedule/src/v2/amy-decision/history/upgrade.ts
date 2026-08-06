/**
 * Schema migration for Decision History documents.
 * Unknown / corrupt → empty. v1 is current.
 * Backfills historyHash when missing.
 */

import { freezeDeep } from "../freeze";
import { createEmptyDecisionHistoryDocument } from "./empty";
import { sealHistoryRecord } from "./history-hash";
import {
  AMY_DECISION_HISTORY_VERSION,
  type DecisionHistoryDocument,
  type DecisionHistoryRecord,
} from "./types";

function migrateRecord(raw: unknown): DecisionHistoryRecord | null {
  if (!raw || typeof raw !== "object" || !("historyId" in raw)) return null;
  const r = JSON.parse(JSON.stringify(raw)) as DecisionHistoryRecord & {
    historyHash?: string;
  };
  const { historyHash: _existing, ...payload } = r;
  // Reseal always so upgraded docs have valid integrity hashes.
  return sealHistoryRecord(payload);
}

/**
 * Upgrade raw parsed JSON into a typed document.
 * Returns null if unrecoverable (caller may treat as empty).
 */
export function upgradeHistoryDocument(
  raw: unknown,
  now: Date = new Date(),
): DecisionHistoryDocument | null {
  if (raw == null) return createEmptyDecisionHistoryDocument(now);
  if (typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;
  const schemaVersion =
    typeof obj.schemaVersion === "string"
      ? obj.schemaVersion
      : AMY_DECISION_HISTORY_VERSION;

  // Future: branch on schemaVersion for migrations.
  if (
    schemaVersion !== AMY_DECISION_HISTORY_VERSION &&
    !schemaVersion.startsWith("amy_decision_history.")
  ) {
    return null;
  }

  const recordsRaw = Array.isArray(obj.records) ? obj.records : [];
  const records = recordsRaw
    .map(migrateRecord)
    .filter((r): r is DecisionHistoryRecord => r != null);

  const currentHistoryId =
    typeof obj.currentHistoryId === "string"
      ? obj.currentHistoryId
      : records.length > 0
        ? records[records.length - 1]!.historyId
        : null;

  const updatedAt =
    typeof obj.updatedAt === "string" ? obj.updatedAt : now.toISOString();

  return freezeDeep({
    schemaVersion: AMY_DECISION_HISTORY_VERSION,
    records: Object.freeze(records),
    currentHistoryId,
    updatedAt,
  });
}
